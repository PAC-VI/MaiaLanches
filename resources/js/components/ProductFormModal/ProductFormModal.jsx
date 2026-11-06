import './ProductFormModal.css';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { NormalText } from '../../../styles/globalStyles';
import { apiFetch } from '../../lib/adminApi';
import { getFieldErrors, translateApiError } from '../../lib/apiErrors';
import { formatPriceInput, parsePrice } from '../../lib/format';
import { useDirtyForm } from '../../lib/useDirtyForm';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';
import FormField from '../FormField/FormField';
import Button from '../Button/Button';
import Toggle from '../Toggle/Toggle';

function readSizes(product) {
    if (Array.isArray(product?.sizes)) {
        return product.sizes;
    }

    if (Array.isArray(product?.sizes?.data)) {
        return product.sizes.data;
    }

    return [];
}

function blankSize() {
    return {
        key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        id: null,
        size_name: '',
        price: '',
        isActive: true,
        canDelete: true,
    };
}

function initialSizes(product) {
    if (!product) {
        return [{ key: 'new-initial', id: null, size_name: 'Único', price: '', isActive: true, canDelete: true }];
    }

    return readSizes(product).map((size) => ({
        key: `size-${size.id}`,
        id: size.id ?? null,
        size_name: size.size_name ?? '',
        price: formatPriceInput(size.price),
        isActive: size.is_active !== false,
        canDelete: size.can_delete !== false,
    }));
}

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

export default function ProductFormModal({ isOpen, product, categories, onClose, onSaved }) {
    const originalSizes = product ? readSizes(product) : [];
    const originalIds = originalSizes.map((size) => size.id).filter((id) => id != null);
    const sizesMissingId = product && originalSizes.length !== originalIds.length;

    const [categoryId, setCategoryId] = useState(() => {
        if (product?.category_id) {
            return String(product.category_id);
        }

        return categories[0] ? String(categories[0].id) : '';
    });
    const [name, setName] = useState(product?.name ?? '');
    const [description, setDescription] = useState(product?.description ?? '');
    const [isActive, setIsActive] = useState(product ? Boolean(product.is_active) : true);
    const [sizes, setSizes] = useState(() => initialSizes(product));
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState(
        sizesMissingId ? 'Não foi possível ler os tamanhos deste produto. Recarregue a lista antes de editar.' : null
    );
    const [submitting, setSubmitting] = useState(false);
    const isDirty = useDirtyForm({
        categoryId,
        name,
        description,
        isActive,
        sizes: sizes.map((size) => ({
            id: size.id,
            size_name: size.size_name,
            price: size.price,
            isActive: size.isActive !== false,
        })),
    });

    const clearSizeErrors = (errors) => {
        const next = { ...errors };
        Object.keys(next).forEach((key) => {
            if (key === 'sizes' || key.startsWith('sizes.')) {
                delete next[key];
            }
        });
        return next;
    };

    const updateSize = (key, field, value) => {
        setSizes((prev) => prev.map((size) => (
            size.key === key ? { ...size, [field]: value } : size
        )));
        setFieldErrors((prev) => clearSizeErrors(prev));
    };

    const addSize = () => {
        setSizes((prev) => [...prev, blankSize()]);
        setFieldErrors((prev) => clearSizeErrors(prev));
    };

    const removeSize = (key) => {
        setSizes((prev) => {
            const target = prev.find((size) => size.key === key);
            if (!target || target.canDelete === false || prev.length <= 1) {
                return prev;
            }

            const next = prev.filter((size) => size.key !== key);
            if (next.length === 1 && !next[0].size_name.trim()) {
                return [{ ...next[0], size_name: 'Único' }];
            }

            return next;
        });
        setFieldErrors((prev) => clearSizeErrors(prev));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting || sizesMissingId) {
            return;
        }

        const errors = {};

        if (!name.trim()) {
            errors.name = 'Verifique o campo nome.';
        }

        if (!categoryId) {
            errors.category_id = 'Verifique o campo categoria.';
        }

        if (sizes.length < 1) {
            errors.sizes = 'Verifique o campo tamanhos.';
        }

        if (sizes.length > 10) {
            errors.sizes = 'O produto pode ter no máximo 10 tamanhos.';
        }

        const seenSizeNames = new Set();

        sizes.forEach((size, index) => {
            const sizeName = size.size_name.trim().replace(/\s+/g, ' ');

            if (!sizeName) {
                errors[`sizes.${index}.size_name`] = 'Verifique o campo nome do tamanho.';
            } else if (seenSizeNames.has(sizeName.toLocaleLowerCase('pt-BR'))) {
                errors[`sizes.${index}.size_name`] = 'Este nome de tamanho já foi usado neste produto.';
            } else {
                seenSizeNames.add(sizeName.toLocaleLowerCase('pt-BR'));
            }

            if (parsePrice(size.price) === null) {
                errors[`sizes.${index}.price`] = 'Verifique o campo preço.';
            }
        });

        const currentIds = sizes.map((size) => size.id).filter((id) => id != null);
        const missingLocked = originalSizes.filter((size) => (
            size.can_delete === false && size.id != null && !currentIds.includes(size.id)
        ));
        if (missingLocked.length > 0) {
            setFieldErrors(errors);
            setFormError('Tamanho que já teve venda não pode ser removido. Desative-o.');
            return;
        }

        setFieldErrors(errors);
        setFormError(null);

        if (Object.keys(errors).length > 0) {
            return;
        }

        const payload = {
            category_id: Number(categoryId),
            name: name.trim(),
            description: description.trim() ? description.trim() : null,
            is_active: isActive,
            sizes: sizes.map((size) => {
                const entry = {
                    size_name: size.size_name.trim(),
                    price: parsePrice(size.price),
                    is_active: size.isActive !== false,
                };

                if (size.id) {
                    entry.id = size.id;
                }

                return entry;
            }),
        };

        setSubmitting(true);

        try {
            if (product) {
                await apiFetch(`/products/${product.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiFetch('/products', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }

            await onSaved();
        } catch (err) {
            const fields = getFieldErrors(err);
            setFieldErrors(fields);
            setFormError(Object.keys(fields).length > 0 ? null : translateApiError(err));
        } finally {
            setSubmitting(false);
        }
    };

    if (!product && categories.length === 0) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} blockDismiss={isDirty}>
                <ModalHeader title="Novo item" onClose={onClose} />
                <NormalText fontSize="1.4rem" color="var(--black)" className="productFormNotice">
                    Crie uma categoria primeiro.
                </NormalText>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} blockDismiss={isDirty}>
            <ModalHeader title={product ? 'Editar produto' : 'Novo item'} onClose={onClose} />

            <form className="productForm" onSubmit={handleSubmit}>
                <div className="productFormField">
                    <label className="formField">
                        <NormalText fontSize="1.2rem">Categoria</NormalText>
                        <select
                            value={categoryId}
                            onChange={(event) => {
                                setCategoryId(event.target.value);
                                setFieldErrors((prev) => ({ ...prev, category_id: undefined }));
                            }}
                        >
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <FieldError message={fieldErrors.category_id} />
                </div>

                <div className="productFormField">
                    <FormField
                        label="Nome"
                        value={name}
                        maxLength={80}
                        onChange={(value) => {
                            setName(value);
                            setFieldErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                    />
                    <FieldError message={fieldErrors.name} />
                </div>

                <div className="productFormField">
                    <label className="formField">
                        <NormalText fontSize="1.2rem">Descrição (opcional)</NormalText>
                        <textarea
                            rows={3}
                            maxLength={500}
                            value={description}
                            onChange={(event) => {
                                setDescription(event.target.value);
                                setFieldErrors((prev) => ({ ...prev, description: undefined }));
                            }}
                        />
                    </label>
                    <FieldError message={fieldErrors.description} />
                </div>

                <div className="productFormActive">
                    <NormalText fontSize="1.3rem" color="var(--black)">Ativo</NormalText>
                    <Toggle checked={isActive} disabled={submitting} onChange={setIsActive} />
                </div>

                <div className="productFormSizes">
                    <NormalText fontSize="1.3rem" color="var(--black)">Tamanhos</NormalText>
                    {product && (
                        <NormalText fontSize="1.2rem">
                            Tamanho que já teve venda não pode ser excluído: use o interruptor para desativar.
                        </NormalText>
                    )}

                    {sizes.map((size, index) => (
                        <div className="productFormSize" key={size.key}>
                            <div className="productFormActive">
                                <NormalText fontSize="1.3rem" color="var(--black)">Ativo</NormalText>
                                <Toggle
                                    checked={size.isActive !== false}
                                    disabled={submitting}
                                    onChange={(value) => updateSize(size.key, 'isActive', value)}
                                />
                            </div>
                            <div className="productFormSizeFields">
                                <div className="productFormField">
                                    <FormField
                                        label="Nome do tamanho"
                                        value={size.size_name}
                                        maxLength={40}
                                        placeholder={sizes.length === 1 ? 'Único' : ''}
                                        onChange={(value) => updateSize(size.key, 'size_name', value)}
                                    />
                                    <FieldError message={fieldErrors[`sizes.${index}.size_name`]} />
                                </div>
                                <div className="productFormField">
                                    <FormField
                                        label="Preço"
                                        value={size.price}
                                        maxLength={8}
                                        inputMode="decimal"
                                        placeholder="0,00"
                                        onChange={(value) => updateSize(size.key, 'price', value)}
                                    />
                                    <FieldError message={fieldErrors[`sizes.${index}.price`]} />
                                </div>
                            </div>
                            <button
                                type="button"
                                className="productFormRemove"
                                onClick={() => removeSize(size.key)}
                                disabled={submitting || size.canDelete === false || sizes.length <= 1}
                                title={size.canDelete === false ? 'Já teve vendas: apenas desative' : undefined}
                            >
                                Remover
                            </button>
                            {size.canDelete === false && (
                                <NormalText fontSize="1.2rem">Já teve vendas: apenas desative</NormalText>
                            )}
                        </div>
                    ))}

                    <FieldError message={fieldErrors.sizes} />

                    <Button
                        variant="outline-success"
                        icon={<Plus size={16} />}
                        onClick={addSize}
                        disabled={submitting || sizesMissingId || sizes.length >= 10}
                    >
                        Adicionar tamanho
                    </Button>
                </div>

                {formError && (
                    <NormalText fontSize="1.2rem" color="var(--main-red)">{formError}</NormalText>
                )}

                <div className="productFormActions">
                    <Button type="submit" variant="solid-success" disabled={submitting || sizesMissingId}>
                        {submitting ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
