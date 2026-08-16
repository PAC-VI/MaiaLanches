import './Home.css';

import ClientLayout from '../../layouts/ClientLayout/ClientLayout';
import InfoButtons from '../../components/InfoButton/InfoButton';
import Warning from '../../components/Warning/Warning';

import { MapPin, Star, Wallet, Clock, Info } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function Home() {
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
                        <MapPin size={16} color="var(--main-red)"/>
                        <NormalText>Rua Faustino Busarello, 792</NormalText> 
                    </div>
                </div>

                <div className="homeFeedbacks">
                    <div className="infoCard">
                        {/* Avaliação */}
                        <div className="infoItem">
                            <span className="infoHighlight">
                                <Title fontSize="1.4rem">4.9</Title>
                                <Star size={14} color="var(--main-red)" fill="var(--main-red)" />
                            </span>

                            <NormalText fontSize="1.2rem">Avaliações</NormalText>
                        </div>

                        <div className="infoDivider"></div>

                        {/* Entrega */}
                        <div className="infoItem">
                            <span className="infoHighlight">
                                <Title fontSize="1.4rem">Entrega</Title>
                            </span>

                            <NormalText fontSize="1.2rem">30min - 45min</NormalText>
                        </div>

                        <div className="infoDivider"></div>

                        {/* Retirada */}
                        <div className="infoItem">
                            <span className="infoHighlight">
                                <Title fontSize="1.4rem">Retirada</Title>
                            </span>

                            <NormalText fontSize="1.2rem">25min</NormalText>
                        </div>
                    </div>
                </div>

                <div className="homeInfoButtons">
                    <InfoButtons 
                        icon={<Wallet size={20} color="var(--main-red)" />} 
                        label="Pagamentos"
                        onClick={() => console.log('Clicou Pagamentos')}
                    />
                    
                    <InfoButtons 
                        icon={<Clock size={20} color="var(--main-red)" />} 
                        label="Horários"
                        onClick={() => console.log('Clicou Horários')}
                    />
                    
                    <InfoButtons 
                        icon={<Info size={20} color="var(--main-red)" />} 
                        label="Informações"
                        onClick={() => console.log('Clicou Informações')}
                    />
                </div>

                <div className="operationWarning">
                    <Warning isOpen={false} />
                    <Warning isOpen={true} />
                </div>

                <div className="sectionOptions">

                </div>

                <div className="search">

                </div>

                <div className="sections">

                </div>
            </div>
        </ClientLayout>
    )
}