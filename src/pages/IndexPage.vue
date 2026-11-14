<template>
    <q-page class="budget-app">
        <BudgetSidebar
            :read-only="readOnly"
            :name="document.name"
            :transaction-count="activeMonth.transactions.length"
            :ready="ready"
            :busy="busy"
            v-model:view="view"
            @rename="showModal('rename')"
            @new="guard(() => showModal('budget'))"
            @open="open" />

        <div class="main-shell">
            <BudgetToolbar
                :read-only="readOnly"
                :view="view"
                :dirty="dirty"
                :file-path="filePath"
                :busy="busy"
                :ready="ready"
                @save="save"
                @rename="showModal('rename')" />

            <main class="main-content">
                <q-banner
                    v-if="readOnly"
                    class="allocation-banner"
                    data-testid="read-only-banner"
                    role="status">
                    <template #avatar><q-icon name="lock" /></template>
                    {{ lockDescription }}
                    <template #action>
                        <q-btn
                            flat
                            no-caps
                            :label="t('files.locks.unlock')"
                            data-testid="unlock-budget"
                            :disable="busy"
                            @click="unlock" />
                    </template>
                </q-banner>
                <q-banner
                    v-if="error"
                    class="error-banner q-mb-md rounded-borders"
                    role="alert">
                    <template #avatar><q-icon name="error_outline" /></template>
                    {{ error }}
                    <template #action>
                        <q-btn
                            flat
                            round
                            dense
                            icon="close"
                            :aria-label="t('common.accessibility.dismissError')"
                            @click="error = ''" />
                    </template>
                </q-banner>
                <div v-if="notice" class="notice" role="status">
                    <q-icon name="check_circle" size="17px" />
                    {{ notice }}
                    <button
                        :aria-label="
                            t('common.accessibility.dismissNotification')
                        "
                        @click="notice = ''">
                        <q-icon name="close" />
                    </button>
                </div>
                <div class="page-heading">
                    <div>
                        <div class="eyebrow">
                            {{ t("budget.page.eyebrow") }}
                        </div>
                        <h1 data-testid="budget-name">{{ document.name }}</h1>
                        <p>{{ t("budget.page.subtitle") }}</p>
                    </div>
                    <div class="month-picker">
                        <q-btn
                            flat
                            dense
                            round
                            icon="chevron_left"
                            :aria-label="t('budget.page.previousMonth')"
                            data-testid="previous-month"
                            @click="
                                selectedMonth = shiftMonth(selectedMonth, -1)
                            " />
                        <q-icon name="calendar_today" size="17px" />
                        <span data-testid="month-label">{{ monthLabel }}</span>
                        <q-btn
                            flat
                            dense
                            round
                            icon="chevron_right"
                            :aria-label="t('budget.page.nextMonth')"
                            data-testid="next-month"
                            @click="
                                selectedMonth = shiftMonth(selectedMonth, 1)
                            " />
                    </div>
                </div>

                <MonthlySummary
                    :read-only="readOnly"
                    :totals="totals"
                    :category-count="categories.length"
                    :transaction-count="activeMonth.transactions.length"
                    @edit-income="showModal('income')" />

                <BudgetIncomeEntries
                    :entries="activeMonth.incomes"
                    :read-only="readOnly"
                    @add="showModal('income')"
                    @edit="editIncome"
                    @remove="removeIncome" />

                <div class="content-columns">
                    <section class="budget-content">
                        <div class="section-heading">
                            <div class="view-tabs">
                                <button
                                    :class="{ selected: view === 'budget' }"
                                    @click="view = 'budget'">
                                    {{ t("budget.page.tab") }}
                                </button>
                                <button
                                    :class="{ selected: view === 'activity' }"
                                    @click="view = 'activity'">
                                    {{ t("navigation.transactions") }}
                                    <span>
                                        {{ activeMonth.transactions.length }}
                                    </span>
                                </button>
                            </div>
                            <q-btn
                                v-if="view === 'budget'"
                                flat
                                no-caps
                                icon="add"
                                :disable="readOnly"
                                :label="t('budget.groups.addGroup')"
                                data-testid="add-group"
                                class="subtle-button"
                                @click="showModal('group')" />
                            <q-btn
                                v-else
                                flat
                                no-caps
                                icon="add"
                                :disable="readOnly"
                                :label="t('transactions.addExpense')"
                                @click="showModal('expense')" />
                        </div>

                        <template v-if="view === 'budget'">
                            <div
                                class="allocation-banner"
                                data-testid="ready-to-assign"
                                role="status">
                                <q-icon
                                    :name="
                                        totals.leftToBudget < 0
                                            ? 'info_outline'
                                            : 'task_alt'
                                    "
                                    size="20px" />
                                <span>
                                    <strong>
                                        {{
                                            money(Math.abs(totals.leftToBudget))
                                        }}
                                    </strong>
                                    {{
                                        totals.leftToBudget < 0
                                            ? t("budget.allocation.overIncome")
                                            : totals.leftToBudget === 0 &&
                                                totals.income > 0
                                              ? t(
                                                    "budget.allocation.fullyAssigned"
                                                )
                                              : t("budget.allocation.remaining")
                                    }}
                                </span>
                            </div>
                            <BudgetGroupCard
                                :read-only="readOnly"
                                v-for="(group, index) in document.groups"
                                :key="group.id"
                                :document="document"
                                :selected-month="selectedMonth"
                                :group="group"
                                :index="index"
                                :collapsed="collapsed.has(group.id)"
                                @toggle="toggleGroup(group.id)"
                                @edit-group="editGroup(group.id)"
                                @delete-group="deleteGroup(group.id)"
                                @plan-category="planCategory"
                                @edit-category="editCategory(group.id, $event)"
                                @delete-category="deleteCategory"
                                @add-category="
                                    showModal('category', group.id)
                                " />
                            <div
                                v-if="!document.groups.length"
                                class="empty-state">
                                <q-icon name="account_tree" size="36px" />
                                <h3>{{ t("budget.page.emptyTitle") }}</h3>
                                <p>
                                    {{ t("budget.page.emptyDescription") }}
                                </p>
                                <q-btn
                                    color="primary"
                                    no-caps
                                    :disable="readOnly"
                                    :label="t('budget.page.emptyAction')"
                                    @click="showModal('group')" />
                            </div>
                            <div class="budget-footnote">
                                <q-icon name="info_outline" size="15px" />
                                {{ t("budget.page.monthNote") }}
                            </div>
                        </template>

                        <BudgetTransactions
                            :read-only="readOnly"
                            v-else
                            :transactions="filteredTransactions"
                            :categories="categories"
                            v-model:search="search"
                            @edit="editExpense"
                            @remove="removeExpense" />
                    </section>

                    <BudgetInsights
                        :read-only="readOnly"
                        :totals="totals"
                        :group-spending="groupSpending"
                        :category-count="categories.length"
                        @add-expense="showModal('expense')" />
                </div>
                <footer class="content-footer">
                    <span>{{ t("budget.page.footer") }}</span>
                    <span :title="filePath">
                        {{ filePath ? fileName : t("budget.page.sampleNote") }}
                    </span>
                </footer>
            </main>
        </div>

        <BudgetEditorDialog
            v-model:mode="modal"
            :form="form"
            :editing="Boolean(editingId)"
            :month-label="monthLabel"
            :selected-month="selectedMonth"
            :category-name="categoryName(editingId)"
            :group-options="groupOptions"
            :category-options="categoryOptions"
            :form-error="formError"
            @update-form="Object.assign(form, $event)"
            @submit="submitForm" />

        <UnsavedChangesDialog
            v-model="confirming"
            :name="document.name"
            :busy="busy"
            @continue="continueAction" />
        <DeleteConfirmationDialog
            v-model="deleteConfirmation"
            :title="deleteTitle"
            :description="deleteDescription"
            @confirm="confirmDelete" />
    </q-page>
</template>

<script setup lang="ts">
import { t } from "../i18n";

import BudgetSidebar from "../components/budget/BudgetSidebar.vue";
import BudgetToolbar from "../components/budget/BudgetToolbar.vue";
import BudgetIncomeEntries from "../components/budget/BudgetIncomeEntries.vue";
import MonthlySummary from "../components/budget/MonthlySummary.vue";
import BudgetGroupCard from "../components/budget/BudgetGroupCard.vue";
import BudgetTransactions from "../components/budget/BudgetTransactions.vue";
import BudgetInsights from "../components/budget/BudgetInsights.vue";
import BudgetEditorDialog from "../components/budget/BudgetEditorDialog.vue";
import UnsavedChangesDialog from "../components/budget/UnsavedChangesDialog.vue";
import DeleteConfirmationDialog from "../components/budget/DeleteConfirmationDialog.vue";
import { money, shiftMonth } from "../lib/budget";
import { useBudgetPage } from "../composables/useBudgetPage";
const {
    document,
    filePath,
    readOnly,
    lockDescription,
    unlock,
    dirty,
    busy,
    ready,
    error,
    notice,
    confirming,
    save,
    open,
    guard,
    continueAction,
    selectedMonth,
    view,
    collapsed,
    search,
    modal,
    editingId,
    formError,
    form,
    activeMonth,
    totals,
    categories,
    monthLabel,
    fileName,
    groupOptions,
    categoryOptions,
    groupSpending,
    filteredTransactions,
    categoryName,
    toggleGroup,
    showModal,
    editGroup,
    editCategory,
    planCategory,
    editExpense,
    editIncome,
    removeIncome,
    submitForm,
    deleteConfirmation,
    deleteTitle,
    deleteDescription,
    deleteCategory,
    deleteGroup,
    removeExpense,
    confirmDelete
} = useBudgetPage();
</script>
