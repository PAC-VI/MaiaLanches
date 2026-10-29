import { formatPrice } from './format';

const TIME_ZONE = 'America/Sao_Paulo';

const PAYMENT_METHODS = [
    { key: 'pix', label: 'Recebido via Pix' },
    { key: 'cartao_credito', label: 'Recebido em cartão de crédito' },
    { key: 'cartao_debito', label: 'Recebido em cartão de débito' },
    { key: 'dinheiro', label: 'Recebido em dinheiro' },
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

function orderDayKey(order) {
    if (!order?.created_at) {
        return null;
    }

    return dayKeyInSaoPaulo(new Date(order.created_at));
}

function toCents(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.round(number * 100);
}

function sumCents(orders, field) {
    return orders.reduce((total, order) => total + toCents(order?.[field]), 0);
}

function ordersBetween(orders, startKey, endKey) {
    return orders.filter((order) => {
        const key = orderDayKey(order);
        return key != null && key >= startKey && key <= endKey;
    });
}

function ordersInWindow(orders, window) {
    return ordersBetween(orders, window.start, window.end);
}

function periodWindow(todayKey, days) {
    return {
        start: addCalendarDays(todayKey, -(days - 1)),
        end: todayKey,
    };
}

function previousWindow(todayKey, days) {
    return {
        start: addCalendarDays(todayKey, -(2 * days - 1)),
        end: addCalendarDays(todayKey, -days),
    };
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

function bestRevenueDay(orders) {
    const totals = new Map();

    orders.forEach((order) => {
        const key = orderDayKey(order);
        if (!key) {
            return;
        }

        totals.set(key, (totals.get(key) ?? 0) + toCents(order.total_amount));
    });

    let best = null;
    totals.forEach((cents, key) => {
        if (!best || cents > best.cents || (cents === best.cents && key > best.key)) {
            best = { key, cents };
        }
    });

    return best;
}

function revenueCard(label, orders, previousOrders, suffix) {
    const current = sumCents(orders, 'total_amount');
    const previous = sumCents(previousOrders, 'total_amount');

    return withComparison(
        { label, value: formatPrice(current / 100) },
        comparisonTrend(current, previous, previousOrders.length > 0, suffix),
    );
}

function countCard(label, orders, previousOrders, suffix, helperText) {
    const card = { label, value: String(orders.length) };
    if (helperText) {
        card.helperText = helperText;
    }

    return withComparison(
        card,
        comparisonTrend(orders.length, previousOrders.length, previousOrders.length > 0, suffix),
    );
}

export function buildReports(orders, now = new Date()) {
    const list = Array.isArray(orders) ? orders : [];
    const todayKey = dayKeyInSaoPaulo(now) ?? dayKeyInSaoPaulo(new Date());

    const today = periodWindow(todayKey, 1);
    const week = periodWindow(todayKey, 7);
    const month = periodWindow(todayKey, 30);

    const todayOrders = ordersInWindow(list, today);
    const weekOrders = ordersInWindow(list, week);
    const monthOrders = ordersInWindow(list, month);
    const previousTodayOrders = ordersInWindow(list, previousWindow(todayKey, 1));
    const previousWeekOrders = ordersInWindow(list, previousWindow(todayKey, 7));
    const previousMonthOrders = ordersInWindow(list, previousWindow(todayKey, 30));

    const monthCents = sumCents(monthOrders, 'total_amount');
    const previousMonthCents = sumCents(previousMonthOrders, 'total_amount');
    const monthCount = monthOrders.length;
    const previousMonthCount = previousMonthOrders.length;
    const ticketCents = monthCount > 0 ? monthCents / monthCount : 0;
    const previousTicketCents = previousMonthCount > 0 ? previousMonthCents / previousMonthCount : 0;

    const monthRevenueTrend = comparisonTrend(
        monthCents,
        previousMonthCents,
        previousMonthCount > 0,
        'vs 30 dias anteriores',
    );
    const monthCountTrend = comparisonTrend(
        monthCount,
        previousMonthCount,
        previousMonthCount > 0,
        'vs 30 dias anteriores',
    );

    const best = bestRevenueDay(monthOrders);
    const deliveryOrders = monthOrders.filter((order) => order.type === 'delivery');
    const pickupOrders = monthOrders.filter((order) => order.type === 'pickup');
    const deliveryFeeCents = sumCents(monthOrders, 'delivery_fee');

    const deliveryPercent = monthCount > 0
        ? ((deliveryOrders.length / monthCount) * 100).toFixed(1).replace('.', ',')
        : null;
    const pickupPercent = monthCount > 0
        ? ((pickupOrders.length / monthCount) * 100).toFixed(1).replace('.', ',')
        : null;

    const reportsHero = {
        label: 'Faturamento dos últimos 30 dias',
        value: formatPrice(monthCents / 100),
        trendText: monthRevenueTrend ? monthRevenueTrend.text : '—',
        note: `${formatDayLabel(month.start)} a ${formatDayLabel(month.end)}, horário de Brasília`,
        stats: [
            { label: 'Média por dia', value: formatPrice(monthCents / 30 / 100) },
            best
                ? {
                    label: 'Melhor dia',
                    value: formatPrice(best.cents / 100),
                    helper: `${weekdayLabel(best.key)} ${formatShortDay(best.key)}`,
                }
                : { label: 'Melhor dia', value: '—' },
            {
                label: 'Pedidos no período',
                value: String(monthCount),
                helper: monthCountTrend ? monthCountTrend.text : '—',
            },
        ],
    };

    const reportSections = [
        {
            title: 'Financeiro',
            description: 'Receita, ticket médio e valores recebidos',
            metrics: [
                revenueCard('Faturamento hoje', todayOrders, previousTodayOrders, 'vs ontem'),
                revenueCard('Faturamento 7 dias', weekOrders, previousWeekOrders, 'vs 7 dias anteriores'),
                revenueCard('Faturamento 30 dias', monthOrders, previousMonthOrders, 'vs 30 dias anteriores'),
                withComparison(
                    {
                        label: 'Ticket médio',
                        value: monthCount > 0 ? formatPrice(ticketCents / 100) : '—',
                    },
                    comparisonTrend(
                        ticketCents,
                        previousTicketCents,
                        previousMonthCount > 0,
                        'vs período anterior',
                    ),
                ),
                ...PAYMENT_METHODS.map(({ key, label }) => {
                    const cents = sumCents(
                        monthOrders.filter((order) => order.payment_method === key),
                        'total_amount',
                    );

                    return {
                        label,
                        value: formatPrice(cents / 100),
                        helperText: formatShare(cents, monthCents, 'do faturamento'),
                    };
                }),
                {
                    label: 'Taxas de entrega arrecadadas',
                    value: formatPrice(deliveryFeeCents / 100),
                    helperText: `${countLabel(deliveryOrders.length, 'entrega', 'entregas')} no período`,
                },
            ],
        },
        {
            title: 'Pedidos',
            description: 'Volume e andamento no período',
            metrics: [
                countCard('Pedidos hoje', todayOrders, previousTodayOrders, 'vs ontem'),
                countCard(
                    'Pedidos 7 dias',
                    weekOrders,
                    previousWeekOrders,
                    'vs 7 dias anteriores',
                    `média de ${formatOneDecimal(weekOrders.length / 7)} pedidos por dia`,
                ),
                countCard('Pedidos 30 dias', monthOrders, previousMonthOrders, 'vs 30 dias anteriores'),
                ...STATUS_METRICS.map(({ key, label }) => {
                    const count = monthOrders.filter((order) => order.status === key).length;

                    return {
                        label,
                        value: String(count),
                        helperText: formatShare(count, monthCount, 'dos pedidos do período'),
                    };
                }),
                {
                    label: 'Entrega x Retirada',
                    value: monthCount > 0 ? `${deliveryPercent}% x ${pickupPercent}%` : '—',
                    helperText: `${countLabel(deliveryOrders.length, 'entrega', 'entregas')} · ${countLabel(pickupOrders.length, 'retirada', 'retiradas')}`,
                },
            ],
        },
    ];

    return { reportsHero, reportSections };
}
