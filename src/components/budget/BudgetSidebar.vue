<template>
    <aside class="sidebar">
        <a
            class="brand"
            href="#/"
            :aria-label="t('common.accessibility.budgetProHome')">
            <span class="brand-icon">
                <q-icon name="account_balance_wallet" size="22px" />
            </span>
            budget
            <span class="brand-light">pro</span>
            <span class="brand-dot">.</span>
        </a>
        <div class="sidebar-label">{{ t("navigation.workspaceHeading") }}</div>
        <button class="workspace-card" @click="emit('rename')">
            <span class="workspace-avatar">
                {{ name.slice(0, 1).toUpperCase() }}
            </span>
            <span class="workspace-info">
                <strong>{{ name }}</strong>
                <small>{{ t("navigation.personalWorkspace") }}</small>
            </span>
            <q-icon name="unfold_more" size="18px" />
        </button>
        <nav :aria-label="t('common.accessibility.mainNavigation')">
            <button
                :class="['nav-item', { active: view === 'budget' }]"
                @click="view = 'budget'">
                <q-icon name="space_dashboard" size="20px" />
                {{ t("navigation.budgetOverview") }}
                <span v-if="view === 'budget'" class="nav-active-dot" />
            </button>
            <button
                :class="['nav-item', { active: view === 'activity' }]"
                @click="view = 'activity'">
                <q-icon name="receipt_long" size="20px" />
                {{ t("navigation.transactions") }}
                <span class="nav-count">{{ transactionCount }}</span>
            </button>
        </nav>
        <div class="sidebar-label file-label">
            {{ t("navigation.filesHeading") }}
        </div>
        <button
            class="nav-item"
            data-testid="new-budget"
            :disabled="!ready || busy"
            @click="emit('new')">
            <q-icon name="add_circle_outline" size="20px" />
            {{ t("files.actions.newBudget") }}
        </button>
        <button
            class="nav-item"
            data-testid="open-budget"
            :disabled="!ready || busy"
            @click="emit('open')">
            <q-icon name="folder_open" size="20px" />
            {{ t("files.actions.openBudget") }}
        </button>
        <div class="sidebar-bottom">
            <div class="privacy-card">
                <q-icon name="verified_user" size="21px" />
                <div>
                    <strong>{{ t("budget.page.privacyTitle") }}</strong>
                    <p>{{ t("budget.page.privacyDescription") }}</p>
                </div>
            </div>
            <div class="sidebar-footer">
                <span class="version-dot" />
                Budget Pro
                <span>v0.0.1</span>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { t } from "../../i18n";

defineProps<{
    name: string;
    transactionCount: number;
    ready: boolean;
    busy: boolean;
}>();
const view = defineModel<"budget" | "activity">("view", { required: true });
const emit = defineEmits<{ rename: []; new: []; open: [] }>();
</script>
