<template>
    <div class="transactions-card">
        <div class="transaction-toolbar">
            <div>
                <h2>{{ t("transactions.title") }}</h2>
                <p>{{ t("transactions.description") }}</p>
            </div>
            <q-input
                v-model="search"
                dense
                outlined
                :placeholder="t('transactions.search')"
                :aria-label="t('transactions.search')"
                class="transaction-search">
                <template #prepend>
                    <q-icon name="search" size="19px" />
                </template>
            </q-input>
        </div>
        <div v-if="!transactions.length" class="empty-state">
            <q-icon name="receipt_long" size="36px" />
            <h3>
                {{
                    search
                        ? t("transactions.noMatches")
                        : t("transactions.emptyTitle")
                }}
            </h3>
            <p>
                {{
                    search
                        ? t("transactions.noMatchesDescription")
                        : t("transactions.emptyDescription")
                }}
            </p>
        </div>
        <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="transaction-row">
            <span class="transaction-icon">
                <q-icon name="shopping_bag" size="20px" />
            </span>
            <div class="transaction-detail">
                <strong>{{ transaction.payee }}</strong>
                <span>
                    {{ categoryName(transaction.categoryId) }}
                    <template v-if="transaction.note">
                        · {{ transaction.note }}
                    </template>
                </span>
            </div>
            <span class="transaction-date">
                {{ formatDate(transaction.date) }}
            </span>
            <strong class="transaction-amount">
                −{{ money(transaction.amount) }}
            </strong>
            <q-btn
                :disable="readOnly"
                flat
                dense
                round
                icon="edit"
                size="sm"
                :aria-label="
                    t('transactions.editLabel', { payee: transaction.payee })
                "
                @click="emit('edit', transaction.id)" />
            <q-btn
                :disable="readOnly"
                flat
                dense
                round
                icon="delete_outline"
                size="sm"
                :aria-label="
                    t('transactions.deleteLabel', { payee: transaction.payee })
                "
                @click="emit('remove', transaction.id)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { t, locale } from "../../i18n";

import {
    money,
    type BudgetTransaction,
    type BudgetCategory
} from "../../lib/budget";
const props = defineProps<{
    readOnly: boolean;
    transactions: BudgetTransaction[];
    categories: BudgetCategory[];
}>();
const search = defineModel<string>("search", { required: true });
const emit = defineEmits<{ edit: [id: string]; remove: [id: string] }>();
function categoryName(id: string) {
    return (
        props.categories.find(category => category.id === id)?.name ||
        t("common.fields.category")
    );
}
function formatDate(date: string) {
    return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric"
    }).format(new Date(`${date}T12:00:00`));
}
</script>
