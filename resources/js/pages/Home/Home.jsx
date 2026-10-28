import './Home.css';

import ClientLayout from '../../layouts/ClientLayout/ClientLayout';
import InfoButtons from '../../components/InfoButton/InfoButton';
import Warning from '../../components/Warning/Warning';
import SearchBar from '../../components/SearchBar/SearchBar';
import CategoryTabs from '../../components/CategoryTabs/CategoryTabs';
import ProductSection from '../../components/ProductSection/ProductSection';
import PaymentMethodsModal from '../../components/PaymentMethodsModal/PaymentMethodsModal';
import OpeningHoursModal from '../../components/OpeningHoursModal/OpeningHoursModal';
import InfoModal from '../../components/InfoModal/InfoModal';
import CartModal from '../../components/CartModal/CartModal';
import StoreHeader from '../../components/StoreHeader/StoreHeader';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { Star, Wallet, Clock, Info, ShoppingCart, ClipboardList } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

import { publicApiFetch } from '../../lib/publicApi';
import { formatPrice } from '../../lib/format';
import { loadCart, repriceCart, saveCart } from '../../lib/cartStorage';

export default function Home() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [addOns, setAddOns] = useState([]);
    const [deliveryZones, setDeliveryZones] = useState([]);
    const [storeSettings, setStoreSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const [activeCategory, setActiveCategory] = useState(null);
    const [search, setSearch] = useState('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const [cart, setCart] = useState(loadCart);

    const sectionRefs = useRef({});
    const isClickScrolling = useRef(false);
    const menuRequestRef = useRef(0);

    useEffect(() => {
        saveCart(cart);
    }, [cart]);

    const loadMenu = useCallback(async ({ silent = false } = {}) => {
        const requestId = ++menuRequestRef.current;

        if (!silent) {
            setIsLoading(true);
            setLoadError(null);
        }

        try {
            const [categoriesData, productsData, addOnsData, zonesData, settingsData] = await Promise.all([
                publicApiFetch('/categories'),
                publicApiFetch('/products?only_active=1'),
                publicApiFetch('/add-ons'),
                publicApiFetch('/delivery-zones'),
                publicApiFetch('/store-settings'),
            ]);

            if (requestId !== menuRequestRef.current) {
                return;
            }

            const categoryList = categoriesData.data ?? categoriesData;
            const productList = productsData.data ?? productsData;
            const addOnList = addOnsData.data ?? addOnsData;
            const zoneList = Array.isArray(zonesData) ? zonesData : (zonesData.data ?? []);

            setCategories(categoryList);
            setProducts(productList);
            setAddOns(addOnList);
            setDeliveryZones(zoneList);
            setStoreSettings(settingsData);
            setLoadError(null);

            if (!silent) {
                setActiveCategory(categoryList[0]?.name ?? null);
            }
        } catch (_) {
            if (requestId === menuRequestRef.current && !silent) {
                setLoadError('Não foi possível carregar o cardápio agora. Tente recarregar a página.');
            }
        } finally {
            if (requestId === menuRequestRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        loadMenu();

        return () => {
            menuRequestRef.current += 1;
        };
    }, [loadMenu]);

    useEffect(() => {
        if (isLoading || loadError) {
            return;
        }

        setCart((current) => repriceCart(current, products, addOns));
    }, [products, addOns, isLoading, loadError]);

    useEffect(() => {
        if (!isCartOpen) {
            return;
        }

        loadMenu({ silent: true });
    }, [isCartOpen, loadMenu]);

    useEffect(() => {
        const refreshIfVisible = () => {
            if (document.hidden) {
                return;
            }

            loadMenu({ silent: true });
        };

        window.addEventListener('focus', refreshIfVisible);
        document.addEventListener('visibilitychange', refreshIfVisible);

        return () => {
            window.removeEventListener('focus', refreshIfVisible);
            document.removeEventListener('visibilitychange', refreshIfVisible);
        };
    }, [loadMenu]);

    const registerSectionRef = useCallback((category) => (node) => {
        sectionRefs.current[category] = node;
    }, []);

    const handleSelectCategory = (category) => {
        isClickScrolling.current = true;
        setActiveCategory(category);

        const node = sectionRefs.current[category];
        node?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        window.clearTimeout(handleSelectCategory._timeout);
        handleSelectCategory._timeout = window.setTimeout(() => {
            isClickScrolling.current = false;
        }, 700);
    };

    // Scroll-spy: atualiza a aba ativa conforme o scroll manual do usuário
    useEffect(() => {
        const sectionOptionsHeight = document.querySelector('.sectionOptions')?.offsetHeight ?? 0;

        const observer = new IntersectionObserver(
            (entries) => {
                if (isClickScrolling.current) return;

                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible.length > 0) {
                    const category = visible[0].target.dataset.category;
                    setActiveCategory(category);
                }
            },
            {
                rootMargin: `-${sectionOptionsHeight + 8}px 0px -70% 0px`,
                threshold: 0,
            }
        );

        Object.values(sectionRefs.current).forEach((node) => {
            if (node) observer.observe(node);
        });

        return () => observer.disconnect();
    }, [search, products]);

    const menu = categories
        .map((category) => ({
            category: category.name,
            products: products.filter((product) => product.category_id === category.id),
        }))
        .filter((section) => section.products.length > 0);

    const categoryNames = menu.map((section) => section.category);

    const filteredMenu = menu
        .map((section) => ({
            ...section,
            products: section.products.filter((p) =>
                p.name.toLowerCase().includes(search.toLowerCase())
            ),
        }))
        .filter((section) => section.products.length > 0);

    const addToCart = (item) => {
        const signature = `${item.sizeId}|${item.observation}|${item.addOns.map((a) => a.id).sort().join(',')}`;

        setCart((current) => {
            const existingIndex = current.findIndex((entry) => entry.signature === signature);

            if (existingIndex >= 0) {
                const updated = [...current];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + item.quantity,
                    unitPrice: Number(item.unitPrice),
                    addOns: item.addOns,
                    productName: item.productName,
                    sizeName: item.sizeName,
                };
                return updated;
            }

            return [
                ...current,
                {
                    cartItemId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    signature,
                    productId: item.productId,
                    productName: item.productName,
                    sizeId: item.sizeId,
                    sizeName: item.sizeName,
                    unitPrice: Number(item.unitPrice),
                    addOns: item.addOns,
                    observation: item.observation,
                    quantity: item.quantity,
                },
            ];
        });
    };

    const updateCartQuantity = (cartItemId, quantity) => {
        setCart((current) => {
            if (quantity <= 0) {
                return current.filter((item) => item.cartItemId !== cartItemId);
            }

            return current.map((item) => (
                item.cartItemId === cartItemId ? { ...item, quantity } : item
            ));
        });
    };

    const removeCartItem = (cartItemId) => {
        setCart((current) => current.filter((item) => item.cartItemId !== cartItemId));
    };

    const handleCartClose = () => {
        setIsCartOpen(false);
    };

    const handleOrderCreated = () => {
        setCart([]);
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const isStoreOpen = storeSettings?.is_open === true || storeSettings?.is_open === 1;

    return (
        <ClientLayout>
            <div className="homeApp">
                <StoreHeader />

                <div className="homeFeedbacks">
                    <div className="infoCard">
                        <div className="infoItem">
                            <span className="infoHighlight">
                                <Title fontSize="1.4rem">4.9</Title>
                                <Star size={14} color="var(--main-red)" fill="var(--main-red)" />
                            </span>

                            <NormalText fontSize="1.2rem">Avaliações</NormalText>
                        </div>

                        <div className="infoDivider"></div>

                        <div className="infoItem">
                            <span className="infoHighlight">
                                <Title fontSize="1.4rem">Entrega</Title>
                            </span>

                            <NormalText fontSize="1.2rem">
                                {storeSettings ? `${storeSettings.delivery_time_minutes}min` : '—'}
                            </NormalText>
                        </div>

                        <div className="infoDivider"></div>

                        <div className="infoItem">
                            <span className="infoHighlight">
                                <Title fontSize="1.4rem">Retirada</Title>
                            </span>

                            <NormalText fontSize="1.2rem">
                                {storeSettings ? `${storeSettings.pickup_time_minutes}min` : '—'}
                            </NormalText>
                        </div>
                    </div>
                </div>

                <div className="homeInfoButtons">
                    <InfoButtons
                        icon={<Wallet size={20} color="var(--main-red)" />}
                        label="Pagamentos"
                        onClick={() => setIsPaymentModalOpen(true)}
                    />

                    <InfoButtons
                        icon={<Clock size={20} color="var(--main-red)" />}
                        label="Horários"
                        onClick={() => setIsHoursModalOpen(true)}
                    />

                    <InfoButtons
                        icon={<Info size={20} color="var(--main-red)" />}
                        label="Informações"
                        onClick={() => setIsInfoModalOpen(true)}
                    />

                    <Link href="/meus-pedidos" className="infoButtonCard homeInfoLink">
                        <div className="infoButtonIcon">
                            <ClipboardList size={20} color="var(--main-red)" />
                        </div>

                        <Title fontSize="1.2rem" fontWeight="500">Pedidos</Title>
                    </Link>
                </div>

                <div className="operationWarning">
                    <Warning isOpen={isStoreOpen} />
                </div>

                <div className="sectionOptions">
                    <CategoryTabs
                        categories={categoryNames}
                        activeCategory={activeCategory}
                        onSelect={handleSelectCategory}
                    />
                </div>

                <div className="search">
                    <SearchBar value={search} onChange={setSearch} />
                </div>

                {isLoading && (
                    <NormalText className="menuStateText" fontSize="1.3rem">Carregando cardápio...</NormalText>
                )}

                {!isLoading && loadError && (
                    <NormalText className="menuStateText" fontSize="1.3rem">{loadError}</NormalText>
                )}

                {!isLoading && !loadError && filteredMenu.length === 0 && (
                    <NormalText className="menuStateText" fontSize="1.3rem">
                        Nenhum produto disponível no momento.
                    </NormalText>
                )}

                <div className="sections">
                    {filteredMenu.map((section) => (
                        <ProductSection
                            key={section.category}
                            ref={registerSectionRef(section.category)}
                            title={section.category}
                            products={section.products}
                            addOns={addOns}
                            onAddProduct={addToCart}
                        />
                    ))}
                </div>

                <NormalText className="footerText">© 2026 Maia Lanches</NormalText>

                {cartCount > 0 && (
                    <button className="floatingCartButton" onClick={() => setIsCartOpen(true)}>
                        <ShoppingCart size={20} color="var(--white)" />
                        <NormalText fontSize="1.3rem" style={{ color: 'var(--white)' }}>
                            {cartCount} {cartCount === 1 ? 'item' : 'itens'}
                        </NormalText>
                        <NormalText fontSize="1.3rem" fontWeight="bold" style={{ color: 'var(--white)' }}>
                            {formatPrice(cartTotal)}
                        </NormalText>
                    </button>
                )}

                <PaymentMethodsModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                />

                <OpeningHoursModal
                    isOpen={isHoursModalOpen}
                    onClose={() => setIsHoursModalOpen(false)}
                />

                <InfoModal
                    isOpen={isInfoModalOpen}
                    onClose={() => setIsInfoModalOpen(false)}
                    storeSettings={storeSettings}
                />

                <CartModal
                    isOpen={isCartOpen}
                    onClose={handleCartClose}
                    onOrderCreated={handleOrderCreated}
                    isStoreOpen={isStoreOpen}
                    cartItems={cart}
                    onUpdateQuantity={updateCartQuantity}
                    onRemoveItem={removeCartItem}
                    deliveryZones={deliveryZones}
                />
            </div>
        </ClientLayout>
    );
}
