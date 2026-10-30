import './MotoboyFormModal.css';

import { useState } from 'react';
import { NormalText } from '../../../styles/globalStyles';
import { apiFetch } from '../../lib/adminApi';
import { getFieldErrors, translateApiError } from '../../lib/apiErrors';
import { filterPersonName, isPersonName, isPhoneNumber, maskPhone } from '../../lib/textInput';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';
import FormField from '../FormField/FormField';
import Button from '../Button/Button';
import Toggle from '../Toggle/Toggle';

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

export default function MotoboyFormModal({ isOpen, motoboy = null, onClose, onSaved }) {
    const isEdit = motoboy?.id != null;
    const [name, setName] = useState(motoboy?.name ?? '');
    const [phone, setPhone] = useState(motoboy?.phone ?? '');
    const [isActive, setIsActive] = useState(motoboy?.is_active !== false);
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
        const maskedPhone = maskPhone(phone);
        const errors = {};

        if (!isPersonName(trimmedName)) {
            errors.name = 'Informe o nome usando apenas letras.';
        }

        if (!isPhoneNumber(maskedPhone)) {
            errors.phone = 'Informe o telefone no formato (XX) XXXXX-XXXX.';
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
            const saved = await apiFetch(isEdit ? `/admin/motoboys/${motoboy.id}` : '/admin/motoboys', {
                method: isEdit ? 'PUT' : 'POST',
                body: JSON.stringify({
                    name: trimmedName,
                    phone: maskedPhone,
                    is_active: isActive,
                }),
            });
            await onSaved(saved?.data);
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
            <ModalHeader title={isEdit ? 'Editar motoboy' : 'Novo motoboy'} onClose={onClose} />

            <form className="motoboyForm" onSubmit={handleSubmit}>
                <div className="motoboyFormField">
                    <FormField
                        label="Nome"
                        value={name}
                        onChange={(value) => {
                            setName(filterPersonName(value));
                            clearErrors();
                        }}
                    />
                    <FieldError message={fieldErrors.name} />
                </div>

                <div className="motoboyFormField">
                    <FormField
                        label="Telefone"
                        value={phone}
                        placeholder="(49) 99999-9999"
                        onChange={(value) => {
                            setPhone(maskPhone(value));
                            clearErrors();
                        }}
                    />
                    <FieldError message={fieldErrors.phone} />
                </div>

                <div className="motoboyFormActive">
                    <NormalText fontSize="1.2rem">Ativo</NormalText>
                    <Toggle
                        checked={isActive}
                        disabled={submitting}
                        onChange={(value) => {
                            setIsActive(value);
                            clearErrors();
                        }}
                    />
                </div>
                <FieldError message={fieldErrors.is_active} />

                {formError && (
                    <NormalText fontSize="1.2rem" color="var(--main-red)">{formError}</NormalText>
                )}

                <div className="motoboyFormActions">
                    <Button type="submit" variant="solid-success" disabled={submitting}>
                        {submitting ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
