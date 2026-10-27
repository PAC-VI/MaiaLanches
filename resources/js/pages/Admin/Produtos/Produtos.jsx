import './Produtos.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { NormalText } from '../../../../styles/globalStyles';
import { apiFetch } from '../../../lib/adminApi';

import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import Button from '../../../components/Button/Button';
import CategorySection from '../../../components/CategorySection/CategorySection';

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

        const results = await Promise.allSettled(
            targets.map((product) =>
                apiFetch(`/products/${product.id}/availability`, {
                    method: 'PATCH',
                    body: JSON.stringify({ is_active: value }),
                })
            )
        );

        const failed = results.filter((result) => result.status === 'rejected').length;

        await loadCatalog({ silent: true });

        if (failed > 0) {
            setActionError(
                failed === 1
                    ? 'Não foi possível atualizar 1 item da categoria.'
                    : `Não foi possível atualizar ${failed} itens da categoria.`
            );
        }

        setCategoryPendingId(null);
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

    const handleEditProduct = (categoryId, productId) => {
        console.log('Editar produto', { categoryId, productId });
    };

    const handleNewCategory = () => {
        console.log('Nova categoria');
    };

    const handleNewItem = () => {
        console.log('Novo item');
    };

    return (
        <AdminLayout>
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
                            onEditProduct={handleEditProduct}
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
            </div>
        </AdminLayout>
    );
}
