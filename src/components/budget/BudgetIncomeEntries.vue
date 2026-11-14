<template>
    <section
        class="transactions-card q-mb-lg"
        :aria-label="t('income.title')"
        data-testid="income-entries">
        <div class="transaction-toolbar">
            <div>
                <h2>{{ t("income.title") }}</h2>
                <p>{{ t("income.description") }}</p>
            </div>
            <q-btn
                flat
                no-caps
                icon="add"
                :disable="readOnly"
                :label="t('income.add')"
                @click="emit('add')" />
        </div>
        <p v-if="!entries.length" class="q-pa-md">{{ t("income.empty") }}</p>
        <div
            v-for="entry in sortedEntries"
            :key="entry.id"
            class="transaction-row">
            <span class="transaction-icon">
                <q-icon name="south_west" size="20px" />
            </span>
            <div class="transaction-detail">
                <strong>{{ entry.source }}</strong>
                <span v-if="entry.note">{{ entry.note }}</span>
            </div>
            <span class="transaction-date">{{ formatDate(entry.date) }}</span>
            <strong class="transaction-amount">
                +{{ money(entry.amount) }}
            </strong>
            <q-btn
                flat
                dense
                round
                icon="edit"
                size="sm"
                :disable="readOnly"
                :aria-label="t('income.editLabel', { source: entry.source })"
                @click="emit('edit', entry.id)" />
            <q-btn
                flat
                dense
                round
                icon="delete_outline"
                size="sm"
                :disable="readOnly"
                :aria-label="t('income.deleteLabel', { source: entry.source })"
                @click="emit('remove', entry.id)" />
        </div>
    </section>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { t, locale } from "../../i18n";
import { money, type BudgetIncome } from "../../lib/budget";
const props = defineProps<{ entries: BudgetIncome[]; readOnly: boolean }>();
const emit = defineEmits<{
    add: [];
    edit: [id: string];
    remove: [id: string];
}>();
const sortedEntries = computed(() =>
    [...props.entries].sort((a, b) => b.date.localeCompare(a.date))
);
function formatDate(date: string) {
    return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric"
    }).format(new Date(`${date}T12:00:00`));
}
</script>
