<template>
    <q-dialog :model-value="Boolean(modal)" @hide="modal = null">
        <q-card class="editor-dialog">
            <q-form @submit="emit('submit')">
                <q-card-section class="dialog-heading">
                    <div>
                        <div class="eyebrow">BUDGET PRO</div>
                        <h2>{{ modalTitle }}</h2>
                    </div>
                    <q-btn
                        v-close-popup
                        flat
                        dense
                        round
                        icon="close"
                        :aria-label="t('common.accessibility.closeDialog')" />
                </q-card-section>
                <q-card-section class="dialog-fields">
                    <p class="dialog-description">{{ modalDescription }}</p>
                    <q-input
                        v-if="
                            ['budget', 'rename', 'group', 'category'].includes(
                                modal || ''
                            )
                        "
                        :model-value="form.name"
                        @update:model-value="updateField('name', $event)"
                        outlined
                        autofocus
                        :label="nameLabel"
                        :maxlength="100"
                        :rules="[
                            value =>
                                Boolean(value?.trim()) ||
                                t('editor.validation.nameRequired')
                        ]" />
                    <q-select
                        v-if="modal === 'category'"
                        :model-value="form.groupId"
                        @update:model-value="updateField('groupId', $event)"
                        outlined
                        :label="t('common.fields.group')"
                        :options="groupOptions"
                        emit-value
                        map-options
                        :rules="[
                            value =>
                                Boolean(value) ||
                                t('editor.validation.groupRequired')
                        ]" />
                    <q-input
                        v-if="
                            modal === 'income' ||
                            modal === 'plan' ||
                            modal === 'expense'
                        "
                        :model-value="form.amount"
                        @update:model-value="updateField('amount', $event)"
                        outlined
                        :autofocus="modal === 'plan'"
                        :label="
                            modal === 'income'
                                ? t('common.fields.income')
                                : modal === 'plan'
                                  ? t('common.fields.plannedAmount')
                                  : t('common.fields.amount')
                        "
                        prefix="$"
                        inputmode="decimal"
                        :rules="[amountRule]" />
                    <template v-if="modal === 'expense' || modal === 'income'">
                        <q-input
                            :model-value="form.payee"
                            @update:model-value="updateField('payee', $event)"
                            outlined
                            :label="
                                modal === 'income'
                                    ? t('income.source')
                                    : t('common.fields.payee')
                            "
                            autofocus
                            maxlength="100"
                            :rules="[
                                value =>
                                    Boolean(value?.trim()) ||
                                    (modal === 'income'
                                        ? t('income.sourceRequired')
                                        : t('editor.validation.payeeRequired'))
                            ]" />
                        <q-select
                            v-if="modal === 'expense'"
                            :model-value="form.categoryId"
                            @update:model-value="
                                updateField('categoryId', $event)
                            "
                            outlined
                            :label="t('common.fields.category')"
                            :options="categoryOptions"
                            emit-value
                            map-options
                            :rules="[
                                value =>
                                    Boolean(value) ||
                                    t('editor.validation.categoryRequired')
                            ]" />
                        <q-input
                            :model-value="form.date"
                            @update:model-value="updateField('date', $event)"
                            outlined
                            :label="t('common.fields.date')"
                            type="date"
                            :rules="[
                                value =>
                                    value?.startsWith(selectedMonth + '-') ||
                                    t('editor.validation.dateInMonth')
                            ]" />
                        <q-input
                            :model-value="form.note"
                            @update:model-value="updateField('note', $event)"
                            outlined
                            :label="t('common.fields.note')"
                            maxlength="500"
                            autogrow />
                    </template>
                    <div v-if="formError" class="form-error" role="alert">
                        {{ formError }}
                    </div>
                </q-card-section>
                <q-card-actions align="right" class="dialog-actions">
                    <q-btn
                        v-close-popup
                        flat
                        no-caps
                        :label="t('common.actions.cancel')" />
                    <q-btn
                        color="primary"
                        unelevated
                        no-caps
                        type="submit"
                        :label="submitLabel" />
                </q-card-actions>
            </q-form>
        </q-card>
    </q-dialog>
</template>
<script setup lang="ts">
import { t } from "../../i18n";

import { computed } from "vue";
import { parseMoney } from "../../lib/budget";
import type {
    BudgetEditorMode,
    BudgetEditorForm
} from "../../types/budget-editor";
const modal = defineModel<BudgetEditorMode | null>("mode", { required: true });
const props = defineProps<{
    form: BudgetEditorForm;
    editing: boolean;
    monthLabel: string;
    selectedMonth: string;
    categoryName: string;
    groupOptions: { label: string; value: string }[];
    categoryOptions: { label: string; value: string }[];
    formError: string;
}>();
const emit = defineEmits<{
    updateForm: [patch: Partial<BudgetEditorForm>];
    submit: [];
}>();
function updateField(field: keyof BudgetEditorForm, value: unknown) {
    emit("updateForm", { [field]: String(value ?? "") });
}
const modalTitle = computed(
    () =>
        ({
            budget: t("files.actions.newBudget"),
            rename: t("files.actions.renameBudget"),
            income: props.editing ? t("income.edit") : t("income.add"),
            group: props.editing
                ? t("budget.groups.renameGroup")
                : t("budget.groups.addGroup"),
            category: props.editing
                ? t("budget.categories.editCategory")
                : t("budget.categories.addCategory"),
            plan: t("editor.titles.planCategory"),
            expense: props.editing
                ? t("editor.titles.editExpense")
                : t("transactions.addExpense")
        })[modal.value || "budget"]
);
const nameLabel = computed(() =>
    modal.value === "group"
        ? t("common.fields.groupName")
        : modal.value === "category"
          ? t("common.fields.categoryName")
          : t("common.fields.budgetName")
);
const submitLabel = computed(
    () =>
        ({
            budget: t("files.actions.createBudget"),
            rename: t("editor.actions.updateName"),
            income: props.editing
                ? t("editor.actions.updateIncome")
                : t("income.add"),
            group: props.editing
                ? t("editor.actions.updateGroup")
                : t("budget.groups.addGroup"),
            category: props.editing
                ? t("editor.actions.updateCategory")
                : t("budget.categories.addCategory"),
            plan: t("editor.actions.updatePlan"),
            expense: props.editing
                ? t("editor.actions.updateExpense")
                : t("transactions.addExpense")
        })[modal.value || "budget"]
);
const modalDescription = computed(
    () =>
        ({
            budget: t("editor.descriptions.newBudget"),
            rename: t("editor.descriptions.renameBudget"),
            income: t("editor.descriptions.income", {
                month: props.monthLabel
            }),
            group: t("editor.descriptions.group"),
            category: t("editor.descriptions.category"),
            plan: t("editor.descriptions.plan", {
                category: props.categoryName,
                month: props.monthLabel
            }),
            expense: t("editor.descriptions.expense", {
                month: props.monthLabel
            })
        })[modal.value || "budget"]
);

function amountRule(value: string) {
    try {
        const amount = parseMoney(value);
        return (modal.value === "expense" || modal.value === "income") &&
            amount === 0
            ? t("editor.validation.positiveAmount")
            : true;
    } catch {
        return t("editor.validation.decimalAmount");
    }
}
</script>
