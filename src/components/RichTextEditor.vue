<script setup>
// Free WYSIWYG editor (Tiptap, MIT). v-model is HTML. Used for long/paragraph
// content in the admin CMS (service body, legal pages, etc.).
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue || '',
  immediatelyRender: false,
  extensions: [StarterKit, Link.configure({ openOnClick: false })],
  onUpdate: ({ editor }) => emit('update:modelValue', editor.getHTML()),
})

watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && val !== editor.value.getHTML()) {
      editor.value.commands.setContent(val || '', false)
    }
  },
)

function setLink() {
  const url = window.prompt('URL (empty to remove):', '')
  if (url === null) return
  if (url === '') editor.value?.chain().focus().unsetLink().run()
  else editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="rte">
    <div v-if="editor" class="rte-toolbar">
      <button type="button" :class="{ active: editor.isActive('bold') }" title="Bold" @click="editor.chain().focus().toggleBold().run()"><b>B</b></button>
      <button type="button" :class="{ active: editor.isActive('italic') }" title="Italic" @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
      <span class="sep"></span>
      <button type="button" :class="{ active: editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" :class="{ active: editor.isActive('heading', { level: 3 }) }" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">H3</button>
      <span class="sep"></span>
      <button type="button" :class="{ active: editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">• List</button>
      <button type="button" :class="{ active: editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()">1. List</button>
      <button type="button" :class="{ active: editor.isActive('link') }" title="Link" @click="setLink">🔗</button>
      <span class="sep"></span>
      <button type="button" title="Undo" @click="editor.chain().focus().undo().run()">↶</button>
      <button type="button" title="Redo" @click="editor.chain().focus().redo().run()">↷</button>
    </div>
    <EditorContent :editor="editor" class="rte-content" />
  </div>
</template>

<style>
.rte { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }
.rte-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 6px; border-bottom: 1px solid #f3f4f6; background: #fafafa; }
.rte-toolbar button { font: 600 12px/1 'Montserrat', sans-serif; padding: 5px 8px; border-radius: 5px; border: none; background: transparent; cursor: pointer; color: #374151; }
.rte-toolbar button:hover { background: #eef0f2; }
.rte-toolbar button.active { background: #f05553; color: #fff; }
.rte-toolbar .sep { width: 1px; height: 16px; background: #e5e7eb; margin: 0 4px; }
.rte-content { padding: 10px 12px; font-size: 14px; color: #111827; }
.rte-content .ProseMirror { outline: none; min-height: 110px; }
.rte-content h2 { font-size: 1.2rem; font-weight: 700; margin: 0.5em 0 0.3em; }
.rte-content h3 { font-size: 1.05rem; font-weight: 600; margin: 0.5em 0 0.3em; }
.rte-content ul { list-style: disc; padding-left: 1.4em; margin: 0.4em 0; }
.rte-content ol { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
.rte-content a { color: #f05553; text-decoration: underline; }
.rte-content p { margin: 0.4em 0; }
.rte-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #9ca3af; float: left; pointer-events: none; height: 0; }
</style>
