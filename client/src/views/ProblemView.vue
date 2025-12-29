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
const showOutput = ref(false)
const hintCooldown = ref(0)
let cooldownTimer = null


const templates = {
    c: `#include <stdio.h>\n\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d\\n", a + b);\n    return 0;\n}`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner s = new Scanner(System.in);\n        if (s.hasNext()) {\n            System.out.println(s.next());\n        }\n    }\n}`,
    python: `# Write your code here\nimport sys\n\nfor line in sys.stdin:\n    print(line.strip())`
}

const userCode = ref(templates.c)

// Language Persistence
const PREF_KEY = 'apcs_preferred_lang'

watch(selectedLang, (newLang) => {
    localStorage.setItem(PREF_KEY, newLang)
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
    // Language Prioritization: URL > LocalStorage > Default
    const queryLang = route.query.lang
    const savedLang = localStorage.getItem(PREF_KEY)
    
    let targetLang = 'c' // Default

    if (queryLang && ['c', 'cpp', 'java', 'python'].includes(queryLang)) {
        targetLang = queryLang
    } else if (savedLang && ['c', 'cpp', 'java', 'python'].includes(savedLang)) {
        targetLang = savedLang
    }

    selectedLang.value = targetLang
    if (templates[targetLang]) {
        userCode.value = templates[targetLang]
    }

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
  showOutput.value = true
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



const startCooldown = (seconds) => {
    hintCooldown.value = seconds
    if (cooldownTimer) clearInterval(cooldownTimer)
    
    cooldownTimer = setInterval(() => {
        hintCooldown.value--
        if (hintCooldown.value <= 0) {
            clearInterval(cooldownTimer)
            hintCooldown.value = 0
        }
    }, 1000)
}

const getHint = async () => {
    if (!auth.user) {
        alert('Please login to use AI Tutor.')
        return
    }
    
    if (hintCooldown.value > 0) return

    executing.value = true
    showOutput.value = true
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
        
        if (res.status === 429) {
             const err = await res.json()
             outputLog.value = `⚠️ Limit Reached: ${err.error}`
             return
        }

        const result = await res.json()
        if (result.error) throw new Error(result.error)
        
        outputLog.value = `💡 AI Hint:\n${result.hint}`
        startCooldown(60) // Start 60s cooldown on success
    } catch (e) {
        outputLog.value = 'AI Error: ' + e.message
    } finally {
        executing.value = false
    }
}

const submitCode = async () => {
  if (!auth.user) {
      showOutput.value = true
      outputLog.value = 'Please login to submit solution.'
      return
  }
  
  executing.value = true
  showOutput.value = true
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
  <div class="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-[#1A1A1A]">
    <!-- Left Panel: Problem Content -->
    <div class="w-full md:w-1/2 flex flex-col border-r border-[#333] bg-[#1e1e1e]">
      <!-- Problem Header (Sticky) -->
      <div class="px-6 pt-6 pb-2 border-b border-[#333] bg-[#1e1e1e] z-10" v-if="question">
        <h1 class="text-3xl font-bold text-white mb-2">{{ question.title }}</h1>
        <div class="flex items-center gap-4 text-xs font-mono text-gray-400 mb-4">
             <div class="flex items-center gap-1 bg-[#2d2d2d] px-2 py-1 rounded border border-[#333]">
                <span>⏱️ Time:</span>
                <span class="font-bold text-gray-200">{{ question.time_limit }}ms</span>
             </div>
             <div class="flex items-center gap-1 bg-[#2d2d2d] px-2 py-1 rounded border border-[#333]">
                <span>💾 Memory:</span>
                <span class="font-bold text-gray-200">{{ question.memory_limit }}MB</span>
             </div>
        </div>
        
        <!-- Tabs -->
        <div class="flex gap-6 border-b border-[#333] -mb-px">
           <button 
            @click="activeTab = 'description'"
            class="pb-3 text-sm font-bold transition-colors"
            :class="activeTab === 'description' ? 'border-b-2 border-teal-500 text-teal-400' : 'text-gray-500 hover:text-gray-300'">
            Description
           </button>
           <button 
            @click="activeTab = 'discussion'"
            class="pb-3 text-sm font-bold transition-colors"
            :class="activeTab === 'discussion' ? 'border-b-2 border-teal-500 text-teal-400' : 'text-gray-500 hover:text-gray-300'">
            Discussion
           </button>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-grow overflow-y-auto px-6 py-6 custom-scrollbar">
        <div v-if="question">
            <div v-show="activeTab === 'description'">
                <!-- Main Description using Typography Plugin -->
                <div class="prose prose-sm prose-invert max-w-none text-gray-300 problem-content" v-html="renderedContent"></div>
                
                <!-- Explicit Sample Cases Cards -->
                <div v-if="question.samples && question.samples.length > 0" class="mt-8">
                    <h3 class="text-sm font-bold text-gray-200 uppercase tracking-wide mb-4">Sample Test Cases</h3>
                    
                    <div v-for="(sample, idx) in question.samples" :key="idx" class="mb-4 border border-[#333] rounded-lg overflow-hidden bg-[#252526]">
                        <div class="bg-[#2d2d2d] px-4 py-2 border-b border-[#333] text-xs font-bold text-gray-400 flex justify-between">
                            <span>Sample #{{ idx + 1 }}</span>
                            <span class="text-gray-500 text-[10px] uppercase cursor-pointer hover:text-teal-400 transition-colors" @click="navigator.clipboard.writeText(sample.input_data)">Copy Input</span>
                        </div>
                        <div class="p-4 grid gap-4">
                            <div>
                                <div class="text-xs font-bold text-gray-500 uppercase mb-1">Input</div>
                                <div class="bg-[#1e1e1e] p-3 rounded font-mono text-sm text-gray-300 whitespace-pre-wrap border border-[#333]">{{ sample.input_data }}</div>
                            </div>
                            <div>
                                <div class="text-xs font-bold text-gray-500 uppercase mb-1">Output</div>
                                <div class="bg-[#1e1e1e] p-3 rounded font-mono text-sm text-gray-300 whitespace-pre-wrap border border-[#333]">{{ sample.output_data }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-show="activeTab === 'discussion'">
                <div class="mb-6">
                     <div v-if="auth.user" class="flex gap-2">
                         <input 
                           v-model="newComment"
                           @keyup.enter="postComment"
                           type="text" 
                           placeholder="Ask a question or share a hint..." 
                           class="flex-grow bg-[#252526] border border-[#333] rounded px-3 py-2 text-sm text-gray-200 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-gray-600"
                         />
                         <button @click="postComment" class="bg-teal-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-teal-700 transition-colors">Post</button>
                     </div>
                     <div v-else class="bg-[#252526] p-3 rounded text-center text-sm text-gray-400 border border-[#333]">
                         <router-link to="/login" class="text-teal-400 hover:underline">Log in</router-link> to join the discussion.
                     </div>
                </div>
                <div class="space-y-4">
                    <div v-if="comments.length === 0" class="text-center text-gray-500 py-10 text-sm">No comments yet. Be the first!</div>
                    <div v-for="c in comments" :key="c.id" class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-[#333] rounded-full flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                            {{ c.email ? c.email[0] : 'U' }}
                        </div>
                        <div class="flex-grow bg-[#252526] rounded-lg p-3 border border-[#333]">
                             <div class="flex items-center justify-between mb-1">
                                 <span class="text-xs font-bold text-gray-300">{{ c.email }}</span>
                                 <span class="text-xs text-gray-600">{{ new Date(c.created_at).toLocaleDateString() }}</span>
                             </div>
                             <p class="text-sm text-gray-400">{{ c.content }}</p>
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
    <div class="w-full md:w-1/2 flex flex-col bg-[#1e1e1e] border-l border-gray-800 relative">
      <div class="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div class="flex items-center gap-4">
            <select v-model="selectedLang" class="bg-[#3c3c3c] text-gray-200 rounded px-3 py-1.5 text-sm outline-none border border-[#333] hover:border-[#555] transition-colors cursor-pointer">
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
            </select>
            <div class="h-6 w-px bg-[#333]"></div>
            <button 
              @click="showOutput = !showOutput"
              class="text-gray-400 hover:text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
              :class="showOutput ? 'text-white bg-[#333]' : ''">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              <span>Console</span>
            </button>
        </div>

        <div class="flex items-center gap-3">
            <button 
              @click="getHint"
              :disabled="executing || hintCooldown > 0"
              class="text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors hover:bg-purple-500/10">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <span>{{ hintCooldown > 0 ? `Wait ${hintCooldown}s` : 'AI Hint' }}</span>
            </button>
            <div class="h-6 w-px bg-[#333]"></div>
            <button 
              @click="runCode"
              :disabled="executing"
              class="text-green-500 hover:text-green-400 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors hover:bg-green-500/10">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
              <span>Run Sample</span>
            </button>
            <button 
              @click="submitCode"
              :disabled="executing"
              class="bg-teal-600 hover:bg-teal-700 text-white px-5 py-1.5 rounded text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-teal-900/20 hover:shadow-teal-700/30 hover:-translate-y-0.5">
              <span v-if="executing" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
              </span>
              <span v-else>Submit</span>
            </button>
        </div>
      </div>
      
      <div class="flex-grow relative min-h-0 flex flex-col">
        <CodeEditor 
          v-model="userCode" 
          :language="selectedLang === 'c' || selectedLang === 'cpp' ? 'cpp' : selectedLang" 
          theme="vs-dark" 
        />
      </div>

      <!-- Terminal / Output -->
      <transition 
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform translate-y-full opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-full opacity-0"
    >
      <div v-if="showOutput" class="h-1/3 bg-[#1e1e1e] text-gray-300 font-mono text-sm border-t border-[#333] flex flex-col absolute bottom-0 left-0 right-0 md:relative md:h-1/3 md:translate-y-0 shadow-2xl md:shadow-none z-50">
        <div class="px-4 py-2 bg-[#252526] text-xs font-bold text-gray-500 uppercase flex justify-between items-center cursor-pointer" @click="showOutput = !showOutput">
            <span class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                Console Output
            </span>
            <div class="flex items-center gap-3">
                 <button @click.stop="outputLog = ''" class="hover:text-gray-300">Clear</button>
                 <button @click.stop="showOutput = false" class="md:hidden hover:text-gray-300">Close</button>
            </div>
        </div>
        <div class="p-4 overflow-y-auto custom-scrollbar flex-grow bg-[#0f0f0f]">
             <pre v-if="outputLog" class="whitespace-pre-wrap font-mono">{{ outputLog }}</pre>
             <div v-else class="text-gray-600 italic">Run code to see output...</div>
        </div>
      </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
/* Custom Typography Overrides for Markdown */
/* Custom Typography Overrides for Text Colors in Dark Mode */
.problem-content :deep(h1), 
.problem-content :deep(h2), 
.problem-content :deep(h3) {
    color: #f3f4f6; /* gray-100 */
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

.problem-content :deep(h1) { font-size: 1.5rem; }
.problem-content :deep(h2) { font-size: 1.25rem; border-bottom: 1px solid #374151; padding-bottom: 0.25em; } /* border-gray-700 */
.problem-content :deep(p), .problem-content :deep(li), .problem-content :deep(strong) {
    color: #d1d5db; /* gray-300 */
}

.problem-content :deep(pre) {
    background-color: #2d2d2d;
    border: 1px solid #333;
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
}
.problem-content :deep(code) {
    background-color: #2d2d2d;
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    color: #e5e7eb;
    font-size: 0.875em;
    font-family: monospace;
}
.problem-content :deep(pre) :deep(code) {
    background-color: transparent;
    color: inherit;
    padding: 0;
    font-family: inherit;
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
  background: #4b5563; /* gray-600 */
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280; /* gray-500 */
}
</style>
