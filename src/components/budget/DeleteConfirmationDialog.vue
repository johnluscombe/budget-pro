<template>
    <q-dialog v-model="visible">
        <q-card class="editor-dialog">
            <q-card-section>
                <h2>{{ title }}</h2>
                <p>{{ description }}</p>
            </q-card-section>
            <q-card-actions align="right" class="dialog-actions">
                <q-btn
                    v-close-popup
                    flat
                    no-caps
                    :label="t('common.actions.cancel')" />
                <q-btn
                    v-close-popup
                    color="negative"
                    unelevated
                    no-caps
                    :label="t('common.actions.delete')"
                    @click="emit('confirm')" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>
<script setup lang="ts">
import { t } from "../../i18n";

const visible = defineModel<boolean>({ required: true });
defineProps<{ title: string; description: string }>();
const emit = defineEmits<{ confirm: [] }>();
</script>
