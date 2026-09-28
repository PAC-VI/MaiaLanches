import './Home.css';

import ClientLayout from '../../layouts/ClientLayout/ClientLayout';
import InfoButtons from '../../components/InfoButton/InfoButton';
import Warning from '../../components/Warning/Warning';
import AlertBanner from '../../components/AlertBanner/AlertBanner';
import SearchBar from '../../components/SearchBar/SearchBar';
import CategoryTabs from '../../components/CategoryTabs/CategoryTabs';
import ProductSection from '../../components/ProductSection/ProductSection';
import PaymentMethodsModal from '../../components/PaymentMethodsModal/PaymentMethodsModal';
import OpeningHoursModal from '../../components/OpeningHoursModal/OpeningHoursModal';
import InfoModal from '../../components/InfoModal/InfoModal';
import CartModal from '../../components/CartModal/CartModal';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Star, Wallet, Clock, Info, ShoppingCart } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

import { publicApiFetch } from '../../lib/publicApi';

function formatPrice(value) {
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

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

    const [cart, setCart] = useState([]);

    const sectionRefs = useRef({});
    const isClickScrolling = useRef(false);

    // Carrega cardápio (categorias + produtos ativos), acréscimos, zonas de
    // entrega e configurações da loja direto da API — nada de mock aqui.
    useEffect(() => {
        let cancelled = false;

        async function loadMenu() {
            try {
                const [categoriesData, productsData, addOnsData, zonesData, settingsData] = await Promise.all([
                    publicApiFetch('/categories'),
                    publicApiFetch('/products?only_active=1'),
                    publicApiFetch('/add-ons'),
                    publicApiFetch('/delivery-zones'),
                    publicApiFetch('/store-settings'),
                ]);

                if (cancelled) return;

                const categoryList = categoriesData.data ?? categoriesData;
                const productList = productsData.data ?? productsData;
                const addOnList = addOnsData.data ?? addOnsData;
                const zoneList = Array.isArray(zonesData) ? zonesData : (zonesData.data ?? []);

                setCategories(categoryList);
                setProducts(productList);
                setAddOns(addOnList);
                setDeliveryZones(zoneList);
                setStoreSettings(settingsData);
                setActiveCategory(categoryList[0]?.name ?? null);
            } catch (err) {
                if (!cancelled) {
                    setLoadError('Não foi possível carregar o cardápio agora. Tente recarregar a página.');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        loadMenu();

        return () => {
            cancelled = true;
        };
    }, []);

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
                    unitPrice: item.unitPrice,
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
        setCart([]);
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return (
        <ClientLayout>
            <div className="homeApp">
                <div className="banner"></div>

                <div className="icon">
                    <img src="/images/main-maia.png" alt="Logo Maia Lanches" className="logoImage" />
                </div>

                <div className="maiaTitle">
                    <Title>Maia Lanches</Title>
                    <div className="loc">
                        <MapPin size={16} color="var(--main-red)" />
                        <NormalText>Rua Faustino Busarello, 792</NormalText>
                    </div>
                </div>

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
                                {storeSettings ? `${storeSettings.delivery_time_minutes}min` : '30min - 45min'}
                            </NormalText>
                        </div>

                        <div className="infoDivider"></div>

                        <div className="infoItem">
                            <span className="infoHighlight">
                                <Title fontSize="1.4rem">Retirada</Title>
                            </span>

                            <NormalText fontSize="1.2rem">
                                {storeSettings ? `${storeSettings.pickup_time_minutes}min` : '25min'}
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
                </div>

                <div className="operationWarning">
                    <Warning isOpen={storeSettings ? storeSettings.is_open : false} />
                    <AlertBanner message="Chave PIX atualizada: (49) 99999-0000. Tempo de espera pode chegar a 60min hoje." />
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
                />

                <CartModal
                    isOpen={isCartOpen}
                    onClose={handleCartClose}
                    cartItems={cart}
                    onUpdateQuantity={updateCartQuantity}
                    onRemoveItem={removeCartItem}
                    deliveryZones={deliveryZones}
                />
            </div>
        </ClientLayout>
    );
}
