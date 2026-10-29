import './Produtos.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { NormalText } from '../../../../styles/globalStyles';
import { apiFetch } from '../../../lib/adminApi';
import { translateApiError } from '../../../lib/apiErrors';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import Button from '../../../components/Button/Button';
import CategorySection from '../../../components/CategorySection/CategorySection';
import AddOnsSection from '../../../components/AddOnsSection/AddOnsSection';
import ProductFormModal from '../../../components/ProductFormModal/ProductFormModal';
import CategoryFormModal from '../../../components/CategoryFormModal/CategoryFormModal';

function unwrapList(payload) {
    const list = payload?.data ?? payload;
    return Array.isArray(list) ? list : [];
}

function mapProduct(product) {
    const sizes = product.sizes ?? [];
    const prices = sizes.map((size) => Number(size.price));
    const price = prices.length > 0 ? Math.min(...prices) : 0;

    return {
        id: product.id,
        name: product.name,
        price,
        active: Boolean(product.is_active),
        canDelete: product.can_delete === true,
        raw: product,
    };
}

function buildCategories(categoryList, productList) {
    return categoryList.map((category) => {
        const products = productList
            .filter((product) => product.category_id === category.id)
            .map(mapProduct);

        return {
            id: category.id,
            name: category.name,
            canDelete: category.can_delete === true,
            active: products.some((product) => product.active),
            products,
        };
    });
}

export default function Produtos() {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [pendingProductId, setPendingProductId] = useState(null);
    const [categoryPendingId, setCategoryPendingId] = useState(null);
    const [productForm, setProductForm] = useState(null);
    const [categoryForm, setCategoryForm] = useState(null);
    const cancelledRef = useRef(false);

    const loadCatalog = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setIsLoading(true);
        }

        setLoadError(null);

        try {
            const [categoriesData, productsData] = await Promise.all([
                apiFetch('/categories'),
                apiFetch('/products'),
            ]);

            if (cancelledRef.current) {
                return;
            }

            setCategories(buildCategories(unwrapList(categoriesData), unwrapList(productsData)));
        } catch (_) {
            if (!cancelledRef.current) {
                setLoadError('Não foi possível carregar os produtos agora.');
            }
        } finally {
            if (!cancelledRef.current && !silent) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        loadCatalog();

        return () => {
            cancelledRef.current = true;
        };
    }, [loadCatalog]);

    const handleToggleCategory = async (categoryId, value) => {
        const category = categories.find((item) => item.id === categoryId);
        if (!category) {
            return;
        }

        const targets = value
            ? category.products.filter((product) => !product.active)
            : category.products.filter((product) => product.active);

        if (value && targets.length > 0) {
            const confirmed = window.confirm(
                'Isso reativa todos os itens da categoria, inclusive os que estavam pausados individualmente. Continuar?'
            );
            if (!confirmed) {
                return;
            }
        }

        if (targets.length === 0) {
            return;
        }

        setCategoryPendingId(categoryId);
        setActionError(null);

        try {
            await apiFetch(`/categories/${categoryId}/availability`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: value }),
            });

            if (cancelledRef.current) {
                return;
            }

            setCategories((prev) => prev.map((item) => {
                if (item.id !== categoryId) {
                    return item;
                }

                const products = item.products.map((product) => ({
                    ...product,
                    active: value,
                    raw: product.raw ? { ...product.raw, is_active: value } : product.raw,
                }));

                return {
                    ...item,
                    products,
                    active: products.some((product) => product.active),
                };
            }));
        } catch (err) {
            if (!cancelledRef.current) {
                setActionError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setCategoryPendingId(null);
            }
        }
    };

    const handleToggleProduct = async (categoryId, productId, value) => {
        setPendingProductId(productId);
        setActionError(null);

        try {
            const response = await apiFetch(`/products/${productId}/availability`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: value }),
            });

            if (cancelledRef.current) {
                return;
            }

            const updated = mapProduct(response.data ?? response);

            setCategories((prev) =>
                prev.map((category) => {
                    if (category.id !== categoryId) {
                        return category;
                    }

                    const products = category.products.map((product) =>
                        product.id === productId ? updated : product
                    );

                    return {
                        ...category,
                        products,
                        active: products.some((product) => product.active),
                    };
                })
            );
        } catch (_) {
            if (!cancelledRef.current) {
                setActionError('Não foi possível atualizar o produto.');
            }
        } finally {
            if (!cancelledRef.current) {
                setPendingProductId(null);
            }
        }
    };

    const handleSaved = async (close) => {
        close();
        await loadCatalog({ silent: true });
    };

    const handleEditProduct = (categoryId, productId) => {
        const category = categories.find((item) => item.id === categoryId);
        const product = category?.products.find((item) => item.id === productId);
        if (!product?.raw) {
            return;
        }

        setProductForm({ product: product.raw });
    };

    const handleNewCategory = () => {
        if (isLoading || loadError) {
            return;
        }

        setCategoryForm({ id: null });
    };

    const handleEditCategory = (categoryId) => {
        const category = categories.find((item) => item.id === categoryId);
        if (!category) {
            return;
        }

        setCategoryForm({ id: category.id, name: category.name });
    };

    const confirmCategoryDelete = (category) => {
        const count = category.products.length;
        const junto = count === 0
            ? 'Nenhum produto será excluído junto'
            : count === 1
                ? '1 produto será excluído junto'
                : `${count} produtos serão excluídos junto`;

        return window.confirm(`Excluir a categoria "${category.name}"? ${junto}.`);
    };

    const handleDeleteCategory = async (categoryId) => {
        const category = categories.find((item) => item.id === categoryId);
        if (!category?.canDelete || categoryPendingId != null) {
            return;
        }

        if (!confirmCategoryDelete(category)) {
            return;
        }

        setCategoryPendingId(categoryId);
        setActionError(null);

        try {
            await apiFetch(`/categories/${categoryId}`, { method: 'DELETE' });

            if (cancelledRef.current) {
                return;
            }

            setCategoryForm((current) => (current?.id === categoryId ? null : current));
            setProductForm((current) => (
                current?.product?.category_id === categoryId ? null : current
            ));
            await loadCatalog({ silent: true });
        } catch (err) {
            if (!cancelledRef.current) {
                setActionError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setCategoryPendingId(null);
            }
        }
    };

    const handleDeleteProduct = async (categoryId, productId) => {
        const category = categories.find((item) => item.id === categoryId);
        const product = category?.products.find((item) => item.id === productId);
        if (!product?.canDelete || pendingProductId != null || categoryPendingId != null) {
            return;
        }

        if (!window.confirm(`Excluir o produto "${product.name}"?`)) {
            return;
        }

        setPendingProductId(productId);
        setActionError(null);

        try {
            await apiFetch(`/products/${productId}`, { method: 'DELETE' });

            if (cancelledRef.current) {
                return;
            }

            setProductForm((current) => (current?.product?.id === productId ? null : current));
            await loadCatalog({ silent: true });
        } catch (err) {
            if (!cancelledRef.current) {
                setActionError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setPendingProductId(null);
            }
        }
    };

    const handleNewItem = () => {
        if (isLoading || loadError) {
            return;
        }

        setProductForm({ product: null });
    };

    return (
        <>
            <div className="produtosApp">
                <AdminPageHeader
                    title="Produtos"
                    subtitle="Organize o cardápio e as receitas por categorias expansíveis."
                >
                    <Button variant="outline-success" icon={<Plus size={16} />} onClick={handleNewCategory}>
                        Nova Categoria
                    </Button>

                    <Button variant="solid-success" icon={<Plus size={16} />} onClick={handleNewItem}>
                        Novo Item
                    </Button>
                </AdminPageHeader>

                <AdminCard>
                    {isLoading && (
                        <NormalText fontSize="1.3rem" className="produtosStateText">
                            Carregando produtos...
                        </NormalText>
                    )}

                    {!isLoading && loadError && (
                        <div className="produtosState">
                            <NormalText fontSize="1.3rem">{loadError}</NormalText>
                            <Button variant="outline-success" onClick={() => loadCatalog()}>
                                Tentar de novo
                            </Button>
                        </div>
                    )}

                    {!isLoading && !loadError && categories.map((category) => (
                        <CategorySection
                            key={category.id}
                            category={category}
                            pendingProductId={pendingProductId}
                            categoryPending={categoryPendingId === category.id}
                            onToggleCategory={handleToggleCategory}
                            onToggleProduct={handleToggleProduct}
                            onEditCategory={handleEditCategory}
                            onDeleteCategory={handleDeleteCategory}
                            onEditProduct={handleEditProduct}
                            onDeleteProduct={handleDeleteProduct}
                        />
                    ))}
                </AdminCard>

                {actionError && (
                    <NormalText fontSize="1.3rem" className="produtosHint">
                        {actionError}
                    </NormalText>
                )}

                <NormalText fontSize="1.3rem" className="produtosHint">
                    Dica: desative uma categoria inteira para pausar todos os itens durante o expediente.
                </NormalText>

                <AddOnsSection />
            </div>

            {productForm && (
                <ProductFormModal
                    key={productForm.product?.id ?? 'new'}
                    isOpen
                    product={productForm.product}
                    categories={categories}
                    onClose={() => setProductForm(null)}
                    onSaved={() => handleSaved(() => setProductForm(null))}
                />
            )}

            {categoryForm && (
                <CategoryFormModal
                    key={categoryForm.id ?? 'new'}
                    isOpen
                    category={categoryForm.id ? categoryForm : null}
                    onClose={() => setCategoryForm(null)}
                    onSaved={() => handleSaved(() => setCategoryForm(null))}
                />
            )}
        </>
    );
}
