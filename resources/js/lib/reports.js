import { formatPrice } from './format';

const TIME_ZONE = 'America/Sao_Paulo';

const PAYMENT_METHODS = [
    { key: 'pix', label: 'Via Pix' },
    { key: 'cartao_credito', label: 'Via cartão de crédito' },
    { key: 'cartao_debito', label: 'Via cartão de débito' },
    { key: 'dinheiro', label: 'Via dinheiro' },
];

const STATUS_METRICS = [
    { key: 'novo', label: 'Novos' },
    { key: 'em_preparo', label: 'Em preparo' },
    { key: 'pronto', label: 'Prontos' },
    { key: 'entregue', label: 'Concluídos' },
];

export function dayKeyInSaoPaulo(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null;
    }

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const value = (type) => parts.find((part) => part.type === type)?.value;
    const year = value('year');
    const month = value('month');
    const day = value('day');

    if (!year || !month || !day) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

export function addCalendarDays(dayKey, delta) {
    const [year, month, day] = dayKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + delta);

    const nextYear = date.getUTCFullYear();
    const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
    const nextDay = String(date.getUTCDate()).padStart(2, '0');

    return `${nextYear}-${nextMonth}-${nextDay}`;
}

function toCents(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.round(number * 100);
}

function formatSignedPercent(rounded) {
    if (rounded === 0) {
        return '0,0%';
    }

    const body = Math.abs(rounded).toFixed(1).replace('.', ',');
    return rounded > 0 ? `+${body}%` : `-${body}%`;
}

function comparisonTrend(current, previous, hasPreviousData, suffix) {
    if (!hasPreviousData || !Number.isFinite(previous) || previous === 0) {
        return null;
    }

    const percent = ((current - previous) / previous) * 100;
    const rounded = Math.round(percent * 10) / 10;

    return {
        direction: rounded < 0 ? 'down' : 'up',
        text: `${formatSignedPercent(rounded)} ${suffix}`,
    };
}

function withComparison(card, trend) {
    if (trend) {
        return { ...card, trend };
    }

    if (card.helperText) {
        return { ...card, helperText: `${card.helperText} · —` };
    }

    return { ...card, helperText: '—' };
}

function formatShare(part, total, suffix) {
    if (!total) {
        return '—';
    }

    const percent = ((part / total) * 100).toFixed(1).replace('.', ',');
    return `${percent}% ${suffix}`;
}

function formatOneDecimal(value) {
    const rounded = Math.round(value * 10) / 10;
    if (Number.isInteger(rounded)) {
        return String(rounded);
    }

    return rounded.toFixed(1).replace('.', ',');
}

function countLabel(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function formatDayLabel(dayKey) {
    const [year, month, day] = dayKey.split('-');
    return `${day}/${month}/${year}`;
}

function formatShortDay(dayKey) {
    const [, month, day] = dayKey.split('-');
    return `${day}/${month}`;
}

function weekdayLabel(dayKey) {
    const [year, month, day] = dayKey.split('-').map(Number);
    const instant = new Date(Date.UTC(year, month - 1, day, 15, 0, 0));
    const name = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        timeZone: TIME_ZONE,
    }).format(instant);

    return name.charAt(0).toUpperCase() + name.slice(1);
}

function bestRevenueDay(series) {
    let best = null;

    series.forEach((point) => {
        if (!point?.orders_count) {
            return;
        }

        const cents = toCents(point.revenue);
        if (!best || cents > best.cents || (cents === best.cents && point.date > best.key)) {
            best = { key: point.date, cents };
        }
    });

    return best;
}

function revenueCard(label, current, previous, suffix) {
    return withComparison(
        { label, value: formatPrice(current.revenue) },
        comparisonTrend(
            toCents(current.revenue),
            toCents(previous.revenue),
            previous.orders_count > 0,
            suffix,
        ),
    );
}

function countCard(label, current, previous, suffix, helperText) {
    const card = { label, value: String(current.orders_count) };
    if (helperText) {
        card.helperText = helperText;
    }

    return withComparison(
        card,
        comparisonTrend(
            current.orders_count,
            previous.orders_count,
            previous.orders_count > 0,
            suffix,
        ),
    );
}

export function buildReports(report) {
    const period = report.period;
    const previous = report.previous_period;
    const today = report.windows.today;
    const previousToday = report.windows.previous_today;
    const week = report.windows.days_7;
    const previousWeek = report.windows.previous_days_7;
    const month = report.windows.days_30;
    const previousMonth = report.windows.previous_days_30;

    const periodCents = toCents(period.revenue);
    const previousCents = toCents(previous.revenue);
    const monthCountTrend = comparisonTrend(
        period.orders_count,
        previous.orders_count,
        previous.orders_count > 0,
        'vs 30 dias anteriores',
    );
    const monthRevenueTrend = comparisonTrend(
        periodCents,
        previousCents,
        previous.orders_count > 0,
        'vs 30 dias anteriores',
    );

    const best = bestRevenueDay(period.series);
    const deliveryPercent = period.orders_count > 0
        ? ((period.delivery_count / period.orders_count) * 100).toFixed(1).replace('.', ',')
        : null;
    const pickupPercent = period.orders_count > 0
        ? ((period.pickup_count / period.orders_count) * 100).toFixed(1).replace('.', ',')
        : null;

    const reportsHero = {
        label: 'Faturamento dos últimos 30 dias',
        value: formatPrice(period.revenue),
        trendText: monthRevenueTrend ? monthRevenueTrend.text : '—',
        note: `${formatDayLabel(period.from)} a ${formatDayLabel(period.to)}, horário de Brasília`,
        stats: [
            { label: 'Média por dia', value: formatPrice(periodCents / period.days / 100) },
            best
                ? {
                    label: 'Melhor dia',
                    value: formatPrice(best.cents / 100),
                    helper: `${weekdayLabel(best.key)} ${formatShortDay(best.key)}`,
                }
                : { label: 'Melhor dia', value: '—' },
            {
                label: 'Pedidos no período',
                value: String(period.orders_count),
                helper: monthCountTrend ? monthCountTrend.text : '—',
            },
        ],
    };

    const reportSections = [
        {
            title: 'Financeiro',
            description: 'Receita, ticket médio e valores recebidos',
            metrics: [
                revenueCard('Faturamento hoje', today, previousToday, 'vs ontem'),
                revenueCard('Faturamento 7 dias', week, previousWeek, 'vs 7 dias anteriores'),
                revenueCard('Faturamento 30 dias', month, previousMonth, 'vs 30 dias anteriores'),
                withComparison(
                    {
                        label: 'Ticket médio',
                        value: period.orders_count > 0 ? formatPrice(period.average_ticket) : '—',
                    },
                    comparisonTrend(
                        period.orders_count > 0 ? toCents(period.average_ticket) : 0,
                        previous.orders_count > 0 ? toCents(previous.average_ticket) : 0,
                        previous.orders_count > 0,
                        'vs período anterior',
                    ),
                ),
                ...PAYMENT_METHODS.map(({ key, label }) => {
                    const cents = toCents(period.by_payment_method[key]);

                    return {
                        label,
                        value: formatPrice(cents / 100),
                        helperText: formatShare(cents, periodCents, 'do faturamento'),
                    };
                }),
                {
                    label: 'Taxas de entrega arrecadadas',
                    value: formatPrice(period.delivery_fees),
                    helperText: `${countLabel(period.delivery_count, 'entrega', 'entregas')} no período`,
                },
            ],
        },
        {
            title: 'Pedidos',
            description: 'Volume e andamento no período',
            metrics: [
                countCard('Pedidos hoje', today, previousToday, 'vs ontem'),
                countCard(
                    'Pedidos 7 dias',
                    week,
                    previousWeek,
                    'vs 7 dias anteriores',
                    `média de ${formatOneDecimal(week.orders_count / week.days)} pedidos por dia`,
                ),
                countCard('Pedidos 30 dias', month, previousMonth, 'vs 30 dias anteriores'),
                ...STATUS_METRICS.map(({ key, label }) => {
                    const count = period.by_status[key];

                    return {
                        label,
                        value: String(count),
                        helperText: formatShare(count, period.orders_count, 'dos pedidos do período'),
                    };
                }),
                {
                    label: 'Em aberto',
                    value: String(period.open_count),
                    helperText: 'ainda não entregues nem cancelados',
                },
                {
                    label: 'Cancelados',
                    value: String(period.cancelled_count),
                    helperText: 'não entram no faturamento',
                },
                {
                    label: 'Entrega x Retirada',
                    value: period.orders_count > 0 ? `${deliveryPercent}% x ${pickupPercent}%` : '—',
                    helperText: `${countLabel(period.delivery_count, 'entrega', 'entregas')} · ${countLabel(period.pickup_count, 'retirada', 'retiradas')}`,
                },
            ],
        },
    ];

    return { reportsHero, reportSections };
}
