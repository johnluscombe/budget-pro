<template>
    <q-dialog v-model="visible" persistent>
        <q-card class="editor-dialog">
            <q-card-section>
                <h2>{{ t("dialogs.unsavedChanges.title") }}</h2>
                <p>
                    {{
                        t("dialogs.unsavedChanges.description", {
                            name: name
                        })
                    }}
                </p>
            </q-card-section>
            <q-card-actions align="right" class="confirm-actions">
                <q-btn
                    flat
                    no-caps
                    :label="t('dialogs.unsavedChanges.keepEditing')"
                    :disable="busy"
                    @click="visible = false" />
                <q-btn
                    flat
                    no-caps
                    :label="t('dialogs.unsavedChanges.discardChanges')"
                    :disable="busy"
                    @click="emit('continue', false)" />
                <q-btn
                    color="primary"
                    unelevated
                    no-caps
                    :label="t('dialogs.unsavedChanges.saveAndContinue')"
                    :loading="busy"
                    @click="emit('continue', true)" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>
<script setup lang="ts">
import { t } from "../../i18n";

const visible = defineModel<boolean>({ required: true });
defineProps<{ name: string; busy: boolean }>();
const emit = defineEmits<{ continue: [save: boolean] }>();
</script>
