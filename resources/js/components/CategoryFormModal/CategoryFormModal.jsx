import './CategoryFormModal.css';

import { useState } from 'react';
import { NormalText } from '../../../styles/globalStyles';
import { apiFetch } from '../../lib/adminApi';
import { getFieldErrors, translateApiError } from '../../lib/apiErrors';

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

export default function CategoryFormModal({ isOpen, onClose, onSaved }) {
    const [name, setName] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        if (!name.trim()) {
            setFieldErrors({ name: 'Verifique o campo nome.' });
            setFormError(null);
            return;
        }

        setFieldErrors({});
        setFormError(null);
        setSubmitting(true);

        try {
            await apiFetch('/categories', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim() }),
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
            <ModalHeader title="Nova categoria" onClose={onClose} />

            <form className="categoryForm" onSubmit={handleSubmit}>
                <div className="categoryFormField">
                    <FormField
                        label="Nome"
                        value={name}
                        onChange={(value) => {
                            setName(value);
                            setFieldErrors({});
                            setFormError(null);
                        }}
                    />
                    <FieldError message={fieldErrors.name} />
                </div>

                {formError && (
                    <NormalText fontSize="1.2rem" color="var(--main-red)">{formError}</NormalText>
                )}

                <div className="categoryFormActions">
                    <Button type="submit" variant="solid-success" disabled={submitting}>
                        {submitting ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
