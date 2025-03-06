<template>
  <div class="fit column">
    <div class="col-auto">
      <q-chat-message
        text-html
        v-if="avatarToggle"
        :sent="sentToggle"
        :name="name"
        :avatar="avatarLink"
        :text="[text]"
      />
      <q-chat-message
        text-html
        v-else
        :sent="sentToggle"
        :name="name"
        :text="[text]"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    text: {
      type: String,
      required: false,
      default: 'This is a message.',
      description: 'The text of the message.',
      builderOptions: { editor: true },
    },
    name: {
      type: String,
      required: false,
      default: 'This is a name',
      description: "The message's sender name.",
    },
    avatarToggle: {
      type: Boolean,
      required: true,
      default: false,
      description: 'Enable avatar on the message',
    },
    sentToggle: {
      type: Boolean,
      required: true,
      default: false,
      description:
        'Change whenever the message is from the current user or not.',
    },
    avatarLink: {
      type: String,
      required: false,
      default: 'https://picsum.photos/128/128',
      description: 'link to the avatar image.',
    },
  },
  builderOptions: {
    slots: ['default'],
    category: 'Example',
    description: 'A simple component, version C.',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
