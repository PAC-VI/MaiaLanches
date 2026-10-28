import './AddOnFormModal.css';

import { useState } from 'react';
import { NormalText } from '../../../styles/globalStyles';
import { apiFetch } from '../../lib/adminApi';
import { getFieldErrors, translateApiError } from '../../lib/apiErrors';
import { formatPriceInput, parsePrice } from '../../lib/format';

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

export default function AddOnFormModal({ isOpen, addOn, onClose, onSaved }) {
    const isEditing = addOn != null;
    const [name, setName] = useState(addOn?.name ?? '');
    const [price, setPrice] = useState(isEditing ? formatPriceInput(addOn.price) : '');
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const clearErrors = () => {
        setFieldErrors({});
        setFormError(null);
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
                body: JSON.stringify({ name: trimmedName, price: parsedPrice }),
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
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title={isEditing ? 'Editar acréscimo' : 'Novo acréscimo'} onClose={onClose} />

            <form className="addOnForm" onSubmit={handleSubmit}>
                <div className="addOnFormField">
                    <FormField
                        label="Nome"
                        value={name}
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
                        onChange={(value) => {
                            setPrice(value);
                            clearErrors();
                        }}
                        placeholder="0,00"
                    />
                    <FieldError message={fieldErrors.price} />
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
