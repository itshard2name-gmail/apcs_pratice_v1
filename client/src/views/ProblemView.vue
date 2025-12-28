<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import markdownit from 'markdown-it'
import hljs from 'highlight.js'
import CodeEditor from '../components/CodeEditor.vue'
import { useAuthStore } from '../stores/auth'
import 'highlight.js/styles/github.css'

const auth = useAuthStore()

const route = useRoute()
const question = ref(null)
const outputLog = ref('')
const selectedLang = ref('c')
const executing = ref(false)

const templates = {
    c: `#include <stdio.h>\n\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d\\n", a + b);\n    return 0;\n}`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner s = new Scanner(System.in);\n        if (s.hasNext()) {\n            System.out.println(s.next());\n        }\n    }\n}`,
    python: `# Write your code here\nimport sys\n\nfor line in sys.stdin:\n    print(line.strip())`
}

const userCode = ref(templates.c)

watch(selectedLang, (newLang) => {
    if (templates[newLang]) {
        userCode.value = templates[newLang]
    }
})

// Discussion State
const activeTab = ref('description') // 'description' or 'discussion'
const comments = ref([])
const newComment = ref('')

const md = markdownit({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; // use external default escaping
  }
})

const renderedContent = computed(() => {
  if (!question.value) return ''
  return md.render(question.value.description)
})

const fetchComments = async () => {
    try {
        const res = await fetch(`/api/comments/${question.value.id}`)
        comments.value = await res.json()
    } catch (e) {
        console.error(e)
    }
}

const postComment = async () => {
    if (!newComment.value.trim()) return
    
    try {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify({
                questionId: question.value.id,
                content: newComment.value
            })
        })
        const added = await res.json()
        comments.value.unshift(added) // Add to top
        newComment.value = ''
    } catch (e) {
        alert('Failed to post comment')
    }
}

onMounted(async () => {
  const id = route.params.id
  try {
    const res = await fetch(`/api/questions/implementation/${id}`)
    question.value = await res.json()
    fetchComments()
  } catch (e) {
    console.error(e)
  }
})

const runCode = async () => {
  executing.value = true
  outputLog.value = 'Compiling and Running...'
  try {
    const res = await fetch('/api/judge/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: userCode.value,
        language: selectedLang.value,
        input: '5 10' // Hardcoded sample input for MVP
      })
    })
    const result = await res.json()
    outputLog.value = result.stdout || result.stderr || 'No output'
  } catch (e) {
    outputLog.value = 'Error executing code: ' + e.message
  } finally {
    executing.value = false
  }
}

const getHint = async () => {
    if (!auth.user) {
        alert('Please login to use AI Tutor.')
        return
    }
    
    executing.value = true
    outputLog.value = 'Asking AI Tutor...\n'
    try {
        const res = await fetch('/api/ai/hint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify({
                code: userCode.value,
                language: selectedLang.value,
                problemTitle: question.value.title,
                problemDescription: question.value.description
            })
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        
        outputLog.value = `💡 AI Hint:\n${result.hint}`
    } catch (e) {
        outputLog.value = 'AI Error: ' + e.message
    } finally {
        executing.value = false
    }
}

const submitCode = async () => {
  if (!auth.user) {
      outputLog.value = 'Please login to submit solution.'
      return
  }
  
  executing.value = true
  outputLog.value = 'Submitting to Judge...\n'
  try {
    const res = await fetch('/api/judge/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        question_id: question.value.id,
        code: userCode.value,
        language: selectedLang.value
      })
    })
    
    const result = await res.json()
    if (result.error) throw new Error(result.error)
    
    outputLog.value = `Verdict: ${result.status}\n\nExecution Log:\n${result.log.join('\n')}`
    
  } catch (e) {
    outputLog.value = 'Submission Error: ' + e.message
  } finally {
    executing.value = false
  }
}
</script>

<template>
  <div class="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden">
    <!-- Left Panel: Problem Content -->
    <div class="w-full md:w-1/2 flex flex-col border-r border-gray-200 bg-white">
      <!-- Problem Header (Sticky) -->
      <div class="px-6 pt-6 pb-2 border-b border-gray-100 bg-white z-10" v-if="question">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ question.title }}</h1>
        <div class="flex items-center gap-4 text-xs font-mono text-gray-500 mb-4">
             <div class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
               <span>⏱️ Time:</span>
               <span class="font-bold text-gray-700">{{ question.time_limit }}ms</span>
             </div>
             <div class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
               <span>💾 Memory:</span>
               <span class="font-bold text-gray-700">{{ question.memory_limit }}MB</span>
             </div>
        </div>
        
        <!-- Tabs -->
        <div class="flex gap-6 border-b border-gray-200 -mb-px">
           <button 
            @click="activeTab = 'description'"
            class="pb-3 text-sm font-bold transition-colors"
            :class="activeTab === 'description' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-400 hover:text-gray-600'">
            Description
           </button>
           <button 
            @click="activeTab = 'discussion'"
            class="pb-3 text-sm font-bold transition-colors"
            :class="activeTab === 'discussion' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-400 hover:text-gray-600'">
            Discussion
           </button>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-grow overflow-y-auto px-6 py-6 custom-scrollbar">
        <div v-if="question">
            <div v-show="activeTab === 'description'">
                <!-- Main Description using Typography Plugin -->
                <div class="prose prose-sm max-w-none text-gray-800 problem-content" v-html="renderedContent"></div>
                
                <!-- Explicit Sample Cases Cards -->
                <div v-if="question.samples && question.samples.length > 0" class="mt-8">
                    <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Sample Test Cases</h3>
                    
                    <div v-for="(sample, idx) in question.samples" :key="idx" class="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                        <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-500">
                            Sample #{{ idx + 1 }}
                        </div>
                        <div class="p-4 grid gap-4">
                            <div>
                                <div class="text-xs font-bold text-gray-400 uppercase mb-1">Input</div>
                                <div class="bg-gray-100 p-3 rounded font-mono text-sm text-gray-800 whitespace-pre-wrap">{{ sample.input_data }}</div>
                            </div>
                            <div>
                                <div class="text-xs font-bold text-gray-400 uppercase mb-1">Output</div>
                                <div class="bg-gray-100 p-3 rounded font-mono text-sm text-gray-800 whitespace-pre-wrap">{{ sample.output_data }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-show="activeTab === 'discussion'">
                <!-- Discussion UI (Same as before) -->
                <div class="mb-6">
                     <div v-if="auth.user" class="flex gap-2">
                         <input 
                           v-model="newComment"
                           @keyup.enter="postComment"
                           type="text" 
                           placeholder="Ask a question or share a hint..." 
                           class="flex-grow border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                         />
                         <button @click="postComment" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">Post</button>
                     </div>
                     <div v-else class="bg-gray-50 p-3 rounded text-center text-sm text-gray-500">
                         <router-link to="/login" class="text-blue-600 hover:underline">Log in</router-link> to join the discussion.
                     </div>
                </div>
                <div class="space-y-4">
                    <div v-if="comments.length === 0" class="text-center text-gray-400 py-10 text-sm">No comments yet. Be the first!</div>
                    <div v-for="c in comments" :key="c.id" class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                            {{ c.email ? c.email[0] : 'U' }}
                        </div>
                        <div class="flex-grow bg-gray-50 rounded-lg p-3">
                             <div class="flex items-center justify-between mb-1">
                                 <span class="text-xs font-bold text-gray-900">{{ c.email }}</span>
                                 <span class="text-xs text-gray-500">{{ new Date(c.created_at).toLocaleDateString() }}</span>
                             </div>
                             <p class="text-sm text-gray-800">{{ c.content }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="flex h-full items-center justify-center text-gray-500">
            <span class="animate-pulse">Loading problem...</span>
        </div>
      </div>
    </div>

    <!-- Right Panel: Code Editor -->
    <div class="w-full md:w-1/2 flex flex-col bg-[#1e1e1e] border-l border-gray-800">
      <div class="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <select v-model="selectedLang" class="bg-[#3c3c3c] text-gray-200 rounded px-3 py-1 text-sm outline-none border border-[#333] hover:border-[#555]">
          <option value="c">C</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
        </select>
        <div class="flex gap-2">
            <button 
              @click="getHint"
              :disabled="executing"
              class="text-purple-400 hover:text-purple-300 px-3 py-1 rounded text-sm font-medium flex items-center gap-1 disabled:opacity-50">
              <span>💡 Ask AI</span>
            </button>
            <div class="h-6 w-px bg-[#333] mx-1"></div>
            <button 
              @click="runCode"
              :disabled="executing"
              class="text-gray-400 hover:text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1 disabled:opacity-50">
              <span>▶ Run Sample</span>
            </button>
            <button 
              @click="submitCode"
              :disabled="executing"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors">
              <span v-if="executing">Judging...</span>
              <span v-else>Submit</span>
            </button>
        </div>
      </div>
      
      <div class="flex-grow relative">
        <CodeEditor 
          v-model="userCode" 
          :language="selectedLang === 'c' || selectedLang === 'cpp' ? 'cpp' : selectedLang" 
          theme="vs-dark" 
        />
      </div>

      <!-- Terminal / Output -->
      <div class="h-1/4 bg-[#1e1e1e] text-gray-300 font-mono text-sm border-t border-[#333] flex flex-col">
        <div class="px-4 py-2 bg-[#252526] text-xs font-bold text-gray-500 uppercase flex justify-between">
            <span>Console Output</span>
            <button v-if="outputLog" @click="outputLog = ''" class="hover:text-gray-300">Clear</button>
        </div>
        <div class="p-4 overflow-y-auto custom-scrollbar flex-grow">
             <pre v-if="outputLog" class="whitespace-pre-wrap">{{ outputLog }}</pre>
             <div v-else class="text-gray-600 italic">Run code to see output...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom Typography Overrides for Markdown */
.problem-content :deep(h1), 
.problem-content :deep(h2), 
.problem-content :deep(h3) {
    color: #111827;
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

.problem-content :deep(h1) { font-size: 1.5rem; }
.problem-content :deep(h2) { font-size: 1.25rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25em; }
.problem-content :deep(pre) {
    background-color: #f3f4f6;
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
}
.problem-content :deep(code) {
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    color: #ef4444;
    font-size: 0.875em;
}
.problem-content :deep(pre) :deep(code) {
    background-color: transparent;
    color: inherit;
    padding: 0;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1; 
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8; 
}
</style>
