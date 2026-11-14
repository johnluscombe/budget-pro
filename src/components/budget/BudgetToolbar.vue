<template>
    <header class="topbar">
        <div class="breadcrumb">
            {{ t("navigation.myWorkspace") }}
            <q-icon name="chevron_right" size="17px" />
            <span>
                {{
                    view === "budget"
                        ? t("navigation.budgetOverview")
                        : t("navigation.transactions")
                }}
            </span>
        </div>
        <div class="file-actions">
            <span class="save-state">
                <span :class="['state-dot', { unsaved: dirty || !filePath }]" />
                {{
                    readOnly
                        ? t("files.locks.readOnlyLabel")
                        : dirty
                          ? t("files.status.unsavedChanges")
                          : filePath
                            ? t("files.status.allChangesSaved")
                            : t("files.status.sampleBudget")
                }}
            </span>
            <q-btn
                outline
                no-caps
                icon="save"
                :label="
                    readOnly
                        ? t('files.locks.saveCopy')
                        : t('files.actions.saveBudget')
                "
                data-testid="save-budget"
                :loading="busy"
                :disable="!ready"
                @click="emit('save', readOnly)" />
            <q-btn
                flat
                round
                dense
                icon="more_horiz"
                :aria-label="t('files.actions.moreFileOptions')">
                <q-menu>
                    <q-list style="min-width: 170px">
                        <q-item
                            v-close-popup
                            clickable
                            data-testid="save-as-budget"
                            @click="emit('save', true)">
                            <q-item-section avatar>
                                <q-icon name="save_as" />
                            </q-item-section>
                            <q-item-section>
                                {{ t("files.actions.saveAs") }}
                            </q-item-section>
                        </q-item>
                        <q-item
                            v-close-popup
                            clickable
                            :disable="readOnly"
                            @click="emit('rename')">
                            <q-item-section avatar>
                                <q-icon name="edit" />
                            </q-item-section>
                            <q-item-section>
                                {{ t("files.actions.renameBudget") }}
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-menu>
            </q-btn>
        </div>
    </header>
</template>

<script setup lang="ts">
import { t } from "../../i18n";

defineProps<{
    readOnly: boolean;
    view: "budget" | "activity";
    dirty: boolean;
    filePath: string;
    busy: boolean;
    ready: boolean;
}>();
const emit = defineEmits<{ save: [saveAs: boolean]; rename: [] }>();
</script>
