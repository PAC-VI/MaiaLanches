import './AddressAutocomplete.css';

import { useEffect, useId, useRef, useState } from 'react';
import { NormalText } from '../../../styles/globalStyles';
import { publicApiFetch } from '../../lib/publicApi';
import { getFieldErrors, translateApiError } from '../../lib/apiErrors';
import {
    filterHouseNumber,
    filterNeighborhood,
    filterReference,
    filterStreet,
    isHouseNumber,
} from '../../lib/textInput';

function newSessionToken() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        const value = char === 'x' ? random : ((random & 0x3) | 0x8);

        return value.toString(16);
    });
}

export default function AddressAutocomplete({
    mode,
    suggestAvailable,
    street,
    number,
    neighborhood,
    reference,
    addressToken,
    fieldErrors,
    onStreetChange,
    onNumberChange,
    onNeighborhoodChange,
    onReferenceChange,
    onResolved,
    onUseManual,
    onUseSuggest,
    onUnavailable,
}) {
    const listId = useId();
    const rootRef = useRef(null);
    const sessionRef = useRef(null);
    const onUnavailableRef = useRef(onUnavailable);
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [lookupError, setLookupError] = useState('');
    const [emptyResult, setEmptyResult] = useState(false);
    const [resolving, setResolving] = useState(false);

    useEffect(() => {
        onUnavailableRef.current = onUnavailable;
    }, [onUnavailable]);

    const manual = mode === 'manual' || !suggestAvailable;
    const streetError = lookupError || fieldErrors.delivery_street || '';

    useEffect(() => {
        const onPointer = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointer);

        return () => document.removeEventListener('mousedown', onPointer);
    }, []);

    useEffect(() => {
        if (manual || addressToken) {
            setSuggestions([]);
            setOpen(false);
            setEmptyResult(false);
            return undefined;
        }

        const query = filterStreet(street).trim();

        if (query.length < 3) {
            setSuggestions([]);
            setOpen(false);
            setEmptyResult(false);
            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                if (!sessionRef.current) {
                    sessionRef.current = newSessionToken();
                }

                const data = await publicApiFetch('/address/suggest', {
                    method: 'POST',
                    body: JSON.stringify({
                        q: query,
                        session_token: sessionRef.current,
                    }),
                    signal: controller.signal,
                });

                if (controller.signal.aborted) {
                    return;
                }

                if (data?.enabled === false) {
                    setSuggestions([]);
                    setOpen(false);
                    onUnavailableRef.current?.();
                    return;
                }

                const list = (Array.isArray(data?.suggestions) ? data.suggestions : [])
                    .filter((item) => item?.place_id && item?.main_text)
                    .slice(0, 5);

                setSuggestions(list);
                setActive(list.length > 0 ? 0 : -1);
                setOpen(list.length > 0);
                setEmptyResult(list.length === 0);
                setLookupError('');
            } catch (err) {
                if (err?.name === 'AbortError' || controller.signal.aborted) {
                    return;
                }

                setSuggestions([]);
                setOpen(false);
                setEmptyResult(false);
                setLookupError(translateApiError(err));
            }
        }, 500);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [street, manual, addressToken]);

    const choose = async (item) => {
        if (resolving || !item?.place_id) {
            return;
        }

        setResolving(true);
        setOpen(false);
        setLookupError('');

        try {
            if (!sessionRef.current) {
                sessionRef.current = newSessionToken();
            }

            const data = await publicApiFetch('/address/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    place_id: item.place_id,
                    session_token: sessionRef.current,
                }),
            });

            sessionRef.current = null;
            setSuggestions([]);
            setEmptyResult(false);
            onResolved?.({
                street: typeof data?.street === 'string' ? data.street : '',
                neighborhood: typeof data?.neighborhood === 'string' ? data.neighborhood : '',
                addressToken: typeof data?.address_token === 'string' ? data.address_token : '',
            });
        } catch (err) {
            const fields = getFieldErrors(err);
            setLookupError(fields.place_id || fields.address_token || translateApiError(err));
        } finally {
            setResolving(false);
        }
    };

    const onStreetKeyDown = (event) => {
        if (event.key === 'Escape') {
            setOpen(false);
            return;
        }

        if (!open || suggestions.length === 0) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((current) => (current + 1) % suggestions.length);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
        }

        if (event.key === 'Enter' && suggestions[active]) {
            event.preventDefault();
            choose(suggestions[active]);
        }
    };

    const activeId = open && active >= 0 ? `${listId}-option-${active}` : undefined;

    return (
        <div className="addressBlock" ref={rootRef}>
            {!suggestAvailable && (
                <NormalText fontSize="1.2rem" color="var(--gray)">
                    A busca de endereços está indisponível.
                </NormalText>
            )}

            <div className="addressLine">
                <div className="formField addressSuggestField">
                    <NormalText fontSize="1.2rem">Rua</NormalText>
                    {manual ? (
                        <input
                            type="text"
                            aria-label="Rua"
                            autoComplete="off"
                            maxLength={80}
                            value={street}
                            onChange={(event) => {
                                setLookupError('');
                                onStreetChange(filterStreet(event.target.value));
                            }}
                        />
                    ) : (
                        <input
                            type="text"
                            role="combobox"
                            aria-label="Rua"
                            aria-expanded={open}
                            aria-controls={listId}
                            aria-activedescendant={activeId}
                            aria-autocomplete="list"
                            autoComplete="off"
                            maxLength={80}
                            value={street}
                            onChange={(event) => {
                                setLookupError('');
                                setEmptyResult(false);
                                onStreetChange(filterStreet(event.target.value));
                            }}
                            onKeyDown={onStreetKeyDown}
                            onFocus={() => {
                                if (suggestions.length > 0) {
                                    setOpen(true);
                                }
                            }}
                        />
                    )}
                    {streetError ? (
                        <NormalText fontSize="1.2rem" color="var(--main-red)">{streetError}</NormalText>
                    ) : null}
                    {resolving && (
                        <NormalText fontSize="1.2rem">Confirmando o endereço...</NormalText>
                    )}
                    {emptyResult && !manual && !lookupError && (
                        <NormalText fontSize="1.2rem" color="var(--gray)">Nenhuma rua encontrada.</NormalText>
                    )}
                    {open && suggestions.length > 0 && (
                        <ul id={listId} role="listbox" className="addressSuggestList">
                            {suggestions.map((item, index) => (
                                <li
                                    key={item.place_id}
                                    id={`${listId}-option-${index}`}
                                    role="option"
                                    aria-selected={index === active}
                                    className={index === active ? 'addressSuggestOption addressSuggestOptionActive' : 'addressSuggestOption'}
                                    onMouseEnter={() => setActive(index)}
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        choose(item);
                                    }}
                                >
                                    <span>{item.main_text}</span>
                                    {item.secondary_text ? (
                                        <span className="addressSuggestSecondary">{item.secondary_text}</span>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <label className="formField">
                    <NormalText fontSize="1.2rem">Número</NormalText>
                    <input
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        maxLength={10}
                        placeholder="123 ou S/N"
                        value={number}
                        onChange={(event) => onNumberChange(filterHouseNumber(event.target.value))}
                    />
                    {fieldErrors.delivery_number ? (
                        <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.delivery_number}</NormalText>
                    ) : null}
                    {isHouseNumber(number) && String(number).toUpperCase() === 'S/N' && (
                        <NormalText fontSize="1.2rem" color="var(--gray)">
                            Sem número, o valor pode variar um pouco.
                        </NormalText>
                    )}
                </label>
            </div>

            {(manual || addressToken) && (
                <label className="formField">
                    <NormalText fontSize="1.2rem">Bairro</NormalText>
                    <input
                        type="text"
                        autoComplete="off"
                        maxLength={60}
                        readOnly={!manual}
                        className={manual ? undefined : 'addressLocked'}
                        value={neighborhood}
                        onChange={(event) => {
                            if (manual) {
                                onNeighborhoodChange(filterNeighborhood(event.target.value));
                            }
                        }}
                    />
                    {fieldErrors.delivery_neighborhood ? (
                        <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.delivery_neighborhood}</NormalText>
                    ) : null}
                </label>
            )}

            <label className="formField">
                <NormalText fontSize="1.2rem">Referência (opcional)</NormalText>
                <input
                    type="text"
                    autoComplete="off"
                    maxLength={80}
                    value={reference}
                    onChange={(event) => onReferenceChange(filterReference(event.target.value))}
                />
                {fieldErrors.delivery_reference ? (
                    <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.delivery_reference}</NormalText>
                ) : null}
            </label>

            {manual ? (
                suggestAvailable ? (
                    <button type="button" className="addressModeLink" onClick={onUseSuggest}>
                        Buscar meu endereço
                    </button>
                ) : (
                    <button type="button" className="addressModeLink" onClick={onUseSuggest}>
                        Tentar a busca de novo
                    </button>
                )
            ) : (
                <button type="button" className="addressModeLink" onClick={onUseManual}>
                    Não encontrei meu endereço
                </button>
            )}
        </div>
    );
}
