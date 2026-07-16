<script setup>
// Free WYSIWYG editor (Tiptap, MIT). v-model is HTML. Used for long/paragraph
// content across the admin CMS (service body, blog, legal, vacancy description…).
// StarterKit v3 already bundles Link + Underline, so no extra extensions needed.
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: { type: String, default: '' },
  minHeight: { type: String, default: '110px' },
})
const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue || '',
  immediatelyRender: false,
  extensions: [StarterKit.configure({ link: { openOnClick: false } })],
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
  const prev = editor.value?.getAttributes('link').href || ''
  const url = window.prompt('URL (empty to remove):', prev)
  if (url === null) return
  if (url === '') editor.value?.chain().focus().unsetLink().run()
  else editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function clearFormat() {
  editor.value?.chain().focus().clearNodes().unsetAllMarks().run()
}

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="rte">
    <div v-if="editor" class="rte-toolbar">
      <button type="button" title="Heading 1" :class="{ active: editor.isActive('heading', { level: 1 }) }" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">H1</button>
      <button type="button" title="Heading 2" :class="{ active: editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" title="Heading 3" :class="{ active: editor.isActive('heading', { level: 3 }) }" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">H3</button>
      <span class="sep"></span>
      <button type="button" title="Bold" :class="{ active: editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()"><b>B</b></button>
      <button type="button" title="Italic" :class="{ active: editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
      <button type="button" title="Underline" :class="{ active: editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()"><u>U</u></button>
      <button type="button" title="Strikethrough" :class="{ active: editor.isActive('strike') }" @click="editor.chain().focus().toggleStrike().run()"><s>S</s></button>
      <span class="sep"></span>
      <button type="button" title="Bullet list" :class="{ active: editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">• List</button>
      <button type="button" title="Numbered list" :class="{ active: editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()">1. List</button>
      <button type="button" title="Quote" :class="{ active: editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()">❝</button>
      <button type="button" title="Code block" :class="{ active: editor.isActive('codeBlock') }" @click="editor.chain().focus().toggleCodeBlock().run()">&lt;/&gt;</button>
      <span class="sep"></span>
      <button type="button" title="Link" :class="{ active: editor.isActive('link') }" @click="setLink">🔗</button>
      <button type="button" title="Divider" @click="editor.chain().focus().setHorizontalRule().run()">―</button>
      <button type="button" title="Clear formatting" @click="clearFormat">⨯</button>
      <span class="sep"></span>
      <button type="button" title="Undo" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">↶</button>
      <button type="button" title="Redo" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">↷</button>
    </div>
    <EditorContent :editor="editor" class="rte-content" :style="{ '--rte-min-h': minHeight }" />
  </div>
</template>

<style>
.rte { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }
.rte-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 6px; border-bottom: 1px solid #f3f4f6; background: #fafafa; position: sticky; top: 0; z-index: 1; }
.rte-toolbar button { font: 600 12px/1 'Montserrat', sans-serif; min-width: 28px; padding: 6px 8px; border-radius: 5px; border: none; background: transparent; cursor: pointer; color: #374151; }
.rte-toolbar button:hover { background: #eef0f2; }
.rte-toolbar button.active { background: #f05553; color: #fff; }
.rte-toolbar button:disabled { opacity: 0.35; cursor: default; }
.rte-toolbar button:disabled:hover { background: transparent; }
.rte-toolbar .sep { width: 1px; height: 16px; background: #e5e7eb; margin: 0 4px; }
.rte-content { padding: 10px 12px; font-size: 14px; color: #111827; }
.rte-content .ProseMirror { outline: none; min-height: var(--rte-min-h, 110px); }
.rte-content h1 { font-size: 1.5rem; font-weight: 800; margin: 0.6em 0 0.35em; }
.rte-content h2 { font-size: 1.2rem; font-weight: 700; margin: 0.5em 0 0.3em; }
.rte-content h3 { font-size: 1.05rem; font-weight: 600; margin: 0.5em 0 0.3em; }
.rte-content ul { list-style: disc; padding-left: 1.4em; margin: 0.4em 0; }
.rte-content ol { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
.rte-content blockquote { border-left: 3px solid #e5e7eb; padding-left: 0.9em; margin: 0.5em 0; color: #6b7280; font-style: italic; }
.rte-content pre { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 10px 12px; margin: 0.5em 0; font-size: 13px; overflow-x: auto; }
.rte-content pre code { background: none; color: inherit; padding: 0; }
.rte-content code { background: #f1f5f9; border-radius: 4px; padding: 0.1em 0.35em; font-size: 0.9em; }
.rte-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 0.9em 0; }
.rte-content a { color: #f05553; text-decoration: underline; }
.rte-content u { text-decoration: underline; }
.rte-content s { text-decoration: line-through; }
.rte-content p { margin: 0.4em 0; }
.rte-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #9ca3af; float: left; pointer-events: none; height: 0; }
</style>
