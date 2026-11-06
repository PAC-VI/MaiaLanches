import './AddOnFormModal.css';

import { useState } from 'react';
import { NormalText } from '../../../styles/globalStyles';
import { apiFetch } from '../../lib/adminApi';
import { getFieldErrors, translateApiError } from '../../lib/apiErrors';
import { formatPriceInput, parsePrice } from '../../lib/format';
import { useDirtyForm } from '../../lib/useDirtyForm';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';
import FormField from '../FormField/FormField';
import Button from '../Button/Button';

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return (
        <NormalText fontSize="1.2rem" color="var(--main-red)">
            {message}
        </NormalText>
    );
}

function normalizeCategoryIds(ids) {
    if (!Array.isArray(ids)) {
        return [];
    }

    return [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id)))].sort((a, b) => a - b);
}

function categoryErrorMessage(fieldErrors) {
    if (fieldErrors.category_ids) {
        return fieldErrors.category_ids;
    }

    const nested = Object.keys(fieldErrors).find((key) => key.startsWith('category_ids.'));
    return nested ? fieldErrors[nested] : null;
}

export default function AddOnFormModal({ isOpen, addOn, categories = [], onClose, onSaved }) {
    const isEditing = addOn != null;
    const [name, setName] = useState(addOn?.name ?? '');
    const [price, setPrice] = useState(isEditing ? formatPriceInput(addOn.price) : '');
    const [categoryIds, setCategoryIds] = useState(() => normalizeCategoryIds(addOn?.category_ids));
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const isDirty = useDirtyForm({ name, price, categoryIds });

    const categoryOptions = categories.map((category) => ({
        id: Number(category.id),
        name: category.name,
    }));
    const allSelected = categoryOptions.length > 0
        && categoryOptions.every((category) => categoryIds.includes(category.id));

    const clearErrors = () => {
        setFieldErrors({});
        setFormError(null);
    };

    const toggleCategory = (categoryId) => {
        setCategoryIds((current) => (
            current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId].sort((a, b) => a - b)
        ));
        clearErrors();
    };

    const toggleAllCategories = () => {
        const allIds = categoryOptions.map((category) => category.id);
        setCategoryIds(allSelected ? [] : allIds);
        clearErrors();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        const trimmedName = name.trim();
        const parsedPrice = parsePrice(price);
        const errors = {};

        if (!trimmedName) {
            errors.name = 'Verifique o campo nome.';
        }

        if (parsedPrice === null) {
            errors.price = 'Verifique o campo preço.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setFormError(null);
            return;
        }

        setFieldErrors({});
        setFormError(null);
        setSubmitting(true);

        try {
            await apiFetch(isEditing ? `/add-ons/${addOn.id}` : '/add-ons', {
                method: isEditing ? 'PUT' : 'POST',
                body: JSON.stringify({
                    name: trimmedName,
                    price: parsedPrice,
                    category_ids: categoryIds,
                }),
            });
            await onSaved();
        } catch (err) {
            const fields = getFieldErrors(err);
            setFieldErrors(fields);
            setFormError(Object.keys(fields).length > 0 ? null : translateApiError(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} blockDismiss={isDirty}>
            <ModalHeader title={isEditing ? 'Editar acréscimo' : 'Novo acréscimo'} onClose={onClose} />

            <form className="addOnForm" onSubmit={handleSubmit}>
                <div className="addOnFormField">
                    <FormField
                        label="Nome"
                        value={name}
                        maxLength={60}
                        onChange={(value) => {
                            setName(value);
                            clearErrors();
                        }}
                    />
                    <FieldError message={fieldErrors.name} />
                </div>

                <div className="addOnFormField">
                    <FormField
                        label="Preço"
                        value={price}
                        maxLength={8}
                        inputMode="decimal"
                        onChange={(value) => {
                            setPrice(value);
                            clearErrors();
                        }}
                        placeholder="0,00"
                    />
                    <FieldError message={fieldErrors.price} />
                </div>

                <div className="addOnFormField">
                    <NormalText fontSize="1.2rem">Categorias</NormalText>

                    {categoryOptions.length === 0 ? (
                        <NormalText fontSize="1.3rem">Nenhuma categoria cadastrada.</NormalText>
                    ) : (
                        <>
                            <label className="addOnCategoryRow">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    disabled={submitting}
                                    onChange={toggleAllCategories}
                                />
                                <NormalText fontSize="1.3rem" color="var(--black)">Marcar todas</NormalText>
                            </label>
                            <div className="addOnCategoryList">
                                {categoryOptions.map((category) => (
                                    <label key={category.id} className="addOnCategoryRow">
                                        <input
                                            type="checkbox"
                                            checked={categoryIds.includes(category.id)}
                                            disabled={submitting}
                                            onChange={() => toggleCategory(category.id)}
                                        />
                                        <NormalText fontSize="1.3rem" color="var(--black)">{category.name}</NormalText>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}

                    {categoryIds.length === 0 && (
                        <NormalText fontSize="1.2rem" color="var(--warning-yellow-text)" className="addOnCategoryWarning">
                            Nenhuma categoria marcada: este acréscimo não aparecerá em nenhum produto.
                        </NormalText>
                    )}
                    <FieldError message={categoryErrorMessage(fieldErrors)} />
                </div>

                {formError && (
                    <NormalText fontSize="1.2rem" color="var(--main-red)">{formError}</NormalText>
                )}

                <div className="addOnFormActions">
                    <Button type="submit" variant="solid-success" disabled={submitting}>
                        {submitting ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
