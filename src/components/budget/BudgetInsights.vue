<template>
    <aside class="insights-column">
        <div class="insight-card">
            <div class="insight-heading">
                <h2>{{ t("insights.spending.title") }}</h2>
                <q-icon name="donut_small" size="20px" />
            </div>
            <p>{{ t("insights.spending.description") }}</p>
            <div
                class="donut"
                :style="{ background: donutBackground }"
                role="img"
                :aria-label="
                    t('insights.spending.accessibleDescription', {
                        amount: money(totals.spent),
                        breakdown: groupSpending
                            .map(g =>
                                t('insights.spending.categorySpending', {
                                    category: g.name,
                                    amount: money(g.spent)
                                })
                            )
                            .join(', ')
                    })
                ">
                <div class="donut-center">
                    <small>{{ t("insights.spending.totalSpentLabel") }}</small>
                    <strong>{{ money(totals.spent) }}</strong>
                </div>
            </div>
            <div
                v-for="(group, index) in groupSpending"
                :key="group.id"
                class="legend-row">
                <span
                    class="legend-dot"
                    :style="{
                        background: chartColors[index % chartColors.length]
                    }" />
                <span>{{ group.name }}</span>
                <strong>{{ money(group.spent) }}</strong>
            </div>
            <div v-if="!groupSpending.length" class="muted">
                {{ t("insights.spending.empty") }}
            </div>
        </div>
        <div class="insight-card pace-card">
            <div class="insight-heading">
                <h2>{{ t("insights.pace.title") }}</h2>
                <q-icon name="trending_up" size="20px" />
            </div>
            <div class="pace-value">
                {{ spentPercent }}
                <span>%</span>
                <small>{{ t("insights.pace.caption") }}</small>
            </div>
            <q-linear-progress
                rounded
                size="7px"
                :value="Math.min(spentPercent / 100, 1)"
                :color="spentPercent > 100 ? 'negative' : 'primary'"
                track-color="grey-3" />
            <div class="pace-labels">
                <span>{{ money(totals.spent) }}</span>
                <span>{{ money(totals.income) }}</span>
            </div>
            <div class="pace-tip">
                <q-icon name="lightbulb_outline" size="20px" />
                <p>
                    {{
                        totals.income === 0
                            ? t("insights.pace.noIncome")
                            : totals.leftToBudget < 0
                              ? t("insights.pace.overIncome")
                              : t("insights.pace.tip")
                    }}
                </p>
            </div>
        </div>
        <q-btn
            class="expense-button"
            color="primary"
            unelevated
            no-caps
            icon="add"
            :label="t('transactions.addExpense')"
            data-testid="add-expense"
            :disable="!categoryCount"
            @click="emit('addExpense')" />
        <div class="local-caption">
            <q-icon name="lock_outline" size="13px" />
            {{ t("budget.page.privacyCaption") }}
        </div>
    </aside>
</template>

<script setup lang="ts">
import { t } from "../../i18n";

import { computed } from "vue";
import { money, type MonthlySummary } from "../../lib/budget";
const props = defineProps<{
    totals: MonthlySummary;
    groupSpending: { id: string; name: string; spent: number }[];
    categoryCount: number;
}>();
const emit = defineEmits<{ addExpense: [] }>();
const chartColors = ["#d99672", "#9291bc", "#6b9e8c", "#739bae", "#d8bb72"];
const spentPercent = computed(() =>
    props.totals.income > 0
        ? Math.round((props.totals.spent / props.totals.income) * 100)
        : 0
);
const donutBackground = computed(() => {
    if (!props.totals.spent) return "#eef1ef";
    let angle = 0;
    const stops = props.groupSpending.map((group, index) => {
        const start = angle;
        angle += (group.spent / props.totals.spent) * 360;
        return `${chartColors[index % chartColors.length]} ${start}deg ${angle}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
});
</script>
