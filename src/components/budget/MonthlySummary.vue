<template>
    <section class="summary-grid" :aria-label="t('summary.label')">
        <article class="summary-card" data-testid="summary-income">
            <div class="summary-top">
                <span>{{ t("summary.monthlyIncome") }}</span>
                <q-icon name="south_west" class="summary-symbol green" />
            </div>
            <div class="summary-value">
                {{ money(totals.income) }}
                <q-btn
                    :disable="readOnly"
                    flat
                    round
                    dense
                    icon="edit"
                    size="sm"
                    :aria-label="t('summary.editMonthlyIncome')"
                    data-testid="edit-income"
                    @click="emit('editIncome')" />
            </div>
            <div class="summary-caption">
                {{ t("summary.incomeCaption") }}
            </div>
        </article>
        <article class="summary-card" data-testid="summary-planned">
            <div class="summary-top">
                <span>{{ t("summary.totalPlanned") }}</span>
                <q-icon name="account_tree" class="summary-symbol purple" />
            </div>
            <div class="summary-value">{{ money(totals.planned) }}</div>
            <div class="summary-caption">
                {{ t("summary.categoryCount", { count: categoryCount }) }}
            </div>
        </article>
        <article class="summary-card" data-testid="summary-spent">
            <div class="summary-top">
                <span>{{ t("summary.spentSoFar") }}</span>
                <q-icon name="north_east" class="summary-symbol peach" />
            </div>
            <div class="summary-value">{{ money(totals.spent) }}</div>
            <div class="summary-caption">
                {{ t("summary.transactionCount", { count: transactionCount }) }}
            </div>
        </article>
        <article
            :class="[
                'summary-card',
                'remaining-card',
                { 'over-budget': totals.remaining < 0 }
            ]"
            data-testid="summary-remaining">
            <div class="summary-top">
                <span>{{ t("summary.leftThisMonth") }}</span>
                <q-icon name="account_balance_wallet" class="summary-symbol" />
            </div>
            <div class="summary-value">{{ money(totals.remaining) }}</div>
            <div class="summary-caption">
                <span class="small-dot" />
                {{
                    totals.remaining < 0
                        ? t("summary.overspent")
                        : t("summary.remainingCaption")
                }}
            </div>
        </article>
    </section>
</template>

<script setup lang="ts">
import { t } from "../../i18n";

import { money, type MonthlySummary } from "../../lib/budget";
defineProps<{
    readOnly: boolean;
    totals: MonthlySummary;
    categoryCount: number;
    transactionCount: number;
}>();
const emit = defineEmits<{ editIncome: [] }>();
</script>
