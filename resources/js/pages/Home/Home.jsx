import './Home.css';

import ClientLayout from '../../layouts/ClientLayout/ClientLayout';
import InfoButtons from '../../components/InfoButton/InfoButton';
import Warning from '../../components/Warning/Warning';
import AlertBanner from '../../components/AlertBanner/AlertBanner';
import SearchBar from '../../components/SearchBar/SearchBar';
import CategoryTabs from '../../components/CategoryTabs/CategoryTabs';
import ProductSection from '../../components/ProductSection/ProductSection';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Star, Wallet, Clock, Info } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

import { mockMenu } from '../../mocks/menuMock';

const categories = mockMenu.map((section) => section.category);

export default function Home() {
    const [activeCategory, setActiveCategory] = useState(categories[0]);
    const [search, setSearch] = useState('');

    const sectionRefs = useRef({});
    const isClickScrolling = useRef(false);

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
    }, [search]);

    const filteredMenu = mockMenu
        .map((section) => ({
            ...section,
            products: section.products.filter((p) =>
                p.name.toLowerCase().includes(search.toLowerCase())
            ),
        }))
        .filter((section) => section.products.length > 0);

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

                            <NormalText fontSize="1.2rem">30min - 45min</NormalText>
                        </div>

                        <div className="infoDivider"></div>

                        <div className="infoItem">
                            <span className="infoHighlight">
                                <Title fontSize="1.4rem">Retirada</Title>
                            </span>

                            <NormalText fontSize="1.2rem">25min</NormalText>
                        </div>
                    </div>
                </div>

                <div className="homeInfoButtons">
                    <InfoButtons icon={<Wallet size={20} color="var(--main-red)" />} label="Pagamentos" onClick={() => console.log('Clicou Pagamentos')} />
                    <InfoButtons icon={<Clock size={20} color="var(--main-red)" />} label="Horários" onClick={() => console.log('Clicou Horários')} />
                    <InfoButtons icon={<Info size={20} color="var(--main-red)" />} label="Informações" onClick={() => console.log('Clicou Informações')} />
                </div>

                <div className="operationWarning">
                    <Warning isOpen={false} />
                    <AlertBanner message="Chave PIX atualizada: (49) 99999-0000. Tempo de espera pode chegar a 60min hoje." />
                </div>

                <div className="sectionOptions">
                    <CategoryTabs
                        categories={categories}
                        activeCategory={activeCategory}
                        onSelect={handleSelectCategory}
                    />
                </div>

                <div className="search">
                    <SearchBar value={search} onChange={setSearch} />
                </div>

                <div className="sections">
                    {filteredMenu.map((section) => (
                        <ProductSection
                            key={section.category}
                            ref={registerSectionRef(section.category)}
                            title={section.category}
                            products={section.products}
                            onAddProduct={(p) => console.log('Adicionou', p)}
                        />
                    ))}
                </div>
            </div>
        </ClientLayout>
    );
}