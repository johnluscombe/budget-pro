<template>
    <article class="group-card">
        <div class="group-heading">
            <button
                class="group-toggle"
                :aria-expanded="!collapsed"
                @click="emit('toggle')">
                <span :class="['group-icon', `tone-${index % 4}`]">
                    <q-icon :name="group.icon" size="20px" />
                </span>
                <h2>{{ group.name }}</h2>
                <span class="category-count">
                    {{ group.categories.length }}
                </span>
                <q-icon
                    :name="collapsed ? 'chevron_right' : 'expand_more'"
                    size="20px" />
            </button>
            <div class="group-heading-right">
                <span>{{ money(planned) }}</span>
                <q-btn
                    flat
                    dense
                    round
                    icon="more_horiz"
                    :aria-label="
                        t('common.actions.optionsFor', { name: group.name })
                    ">
                    <q-menu>
                        <q-list>
                            <q-item
                                v-close-popup
                                clickable
                                @click="emit('editGroup')">
                                <q-item-section>
                                    {{ t("budget.groups.renameGroup") }}
                                </q-item-section>
                            </q-item>
                            <q-item
                                v-close-popup
                                clickable
                                @click="emit('deleteGroup')">
                                <q-item-section class="text-negative">
                                    {{ t("budget.groups.deleteGroup") }}
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </q-menu>
                </q-btn>
            </div>
        </div>
        <div v-show="!collapsed" class="group-body">
            <div class="category-table-header">
                <span>{{ t("common.fields.category") }}</span>
                <span>{{ t("budget.categories.planned") }}</span>
                <span>{{ t("budget.categories.spent") }}</span>
                <span>{{ t("budget.categories.available") }}</span>
                <span />
            </div>
            <div
                v-for="category in group.categories"
                :key="category.id"
                class="category-row"
                data-testid="category-row"
                :data-category-id="category.id">
                <div class="category-cell">
                    <span :class="['category-dot', `tone-${index % 4}`]" />
                    <span>{{ category.name }}</span>
                </div>
                <button
                    class="amount-button"
                    :aria-label="
                        t('budget.categories.plan', { name: category.name })
                    "
                    @click="emit('planCategory', category.id)">
                    {{
                        money(
                            categoryTotals(document, selectedMonth, category.id)
                                .planned
                        )
                    }}
                    <q-icon name="edit" size="12px" />
                </button>
                <span class="spent-amount">
                    {{
                        money(
                            categoryTotals(document, selectedMonth, category.id)
                                .spent
                        )
                    }}
                </span>
                <span
                    :class="[
                        'available-amount',
                        {
                            negative:
                                categoryTotals(
                                    document,
                                    selectedMonth,
                                    category.id
                                ).available < 0
                        }
                    ]">
                    {{
                        money(
                            categoryTotals(document, selectedMonth, category.id)
                                .available
                        )
                    }}
                </span>
                <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="more_horiz"
                    :aria-label="
                        t('common.actions.optionsFor', { name: category.name })
                    ">
                    <q-menu>
                        <q-list>
                            <q-item
                                v-close-popup
                                clickable
                                :aria-label="
                                    t('common.actions.editNamedItem', {
                                        name: category.name
                                    })
                                "
                                @click="emit('editCategory', category.id)">
                                <q-item-section>
                                    {{ t("budget.categories.editCategory") }}
                                </q-item-section>
                            </q-item>
                            <q-item
                                v-close-popup
                                clickable
                                :aria-label="
                                    t('common.actions.deleteNamedItem', {
                                        name: category.name
                                    })
                                "
                                @click="emit('deleteCategory', category.id)">
                                <q-item-section class="text-negative">
                                    {{ t("budget.categories.deleteCategory") }}
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </q-menu>
                </q-btn>
            </div>
            <button
                class="add-category"
                :data-testid="`add-category-${group.id}`"
                :aria-label="
                    t('budget.categories.addCategoryTo', { group: group.name })
                "
                @click="emit('addCategory')">
                <q-icon name="add" size="17px" />
                {{ t("budget.categories.addCategory") }}
            </button>
        </div>
    </article>
</template>

<script setup lang="ts">
import { t } from "../../i18n";

import { computed } from "vue";
import {
    categoryTotals,
    money,
    type BudgetDocument,
    type BudgetGroup
} from "../../lib/budget";
const props = defineProps<{
    document: BudgetDocument;
    selectedMonth: string;
    group: BudgetGroup;
    index: number;
    collapsed: boolean;
}>();
const planned = computed(() =>
    props.group.categories.reduce(
        (total, category) =>
            total +
            categoryTotals(props.document, props.selectedMonth, category.id)
                .planned,
        0
    )
);
const emit = defineEmits<{
    toggle: [];
    editGroup: [];
    deleteGroup: [];
    planCategory: [id: string];
    editCategory: [id: string];
    deleteCategory: [id: string];
    addCategory: [];
}>();
</script>
