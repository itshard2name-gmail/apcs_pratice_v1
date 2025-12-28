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
// userCode declaration removed from here
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
    <!-- Left Panel: Problem Description -->
    <div class="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-200 bg-white">
      <div v-if="question">
        <div class="flex items-center justify-between mb-4 border-b border-gray-200">
             <div class="flex space-x-4">
                 <button 
                  @click="activeTab = 'description'"
                  class="pb-2 px-1 font-medium text-sm"
                  :class="activeTab === 'description' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'">
                  Description
                 </button>
                 <button 
                  @click="activeTab = 'discussion'"
                  class="pb-2 px-1 font-medium text-sm"
                  :class="activeTab === 'discussion' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'">
                  Discussion
                 </button>
             </div>
        </div>

        <div v-show="activeTab === 'description'">
            <h1 class="text-2xl font-bold mb-4">{{ question.title }}</h1>
            <div class="space-y-2 mb-4 text-sm text-gray-600">
               <span class="mr-4">⏱️ Time: {{ question.time_limit }}ms</span>
               <span>💾 Memory: {{ question.memory_limit }}MB</span>
            </div>
            <div class="prose max-w-none" v-html="renderedContent"></div>
        </div>

        <div v-show="activeTab === 'discussion'">
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
      <div v-else class="text-center mt-10 text-gray-500">Loading problem...</div>
    </div>

    <!-- Right Panel: Code Editor -->
    <div class="w-full md:w-1/2 flex flex-col bg-gray-900">
      <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <select v-model="selectedLang" class="bg-gray-700 text-white rounded px-2 py-1 text-sm outline-none border border-gray-600">
          <option value="c">C</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
        </select>
        <button 
          @click="getHint"
          :disabled="executing"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded text-sm font-bold flex items-center gap-2 disabled:opacity-50 mr-2">
          <span>💡 Ask AI</span>
        </button>
        <button 
          @click="runCode"
          :disabled="executing"
          class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-1 rounded text-sm font-bold flex items-center gap-2 disabled:opacity-50 mr-2">
          <span>▶ Run Sample</span>
        </button>
        <button 
          @click="submitCode"
          :disabled="executing"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded text-sm font-bold flex items-center gap-2 disabled:opacity-50">
          <span v-if="executing">Judging...</span>
          <span v-else>✔ Submit</span>
        </button>
      </div>
      
      <div class="flex-grow">
        <CodeEditor 
          v-model="userCode" 
          :language="selectedLang === 'c' || selectedLang === 'cpp' ? 'cpp' : selectedLang" 
          theme="vs-dark" 
        />
      </div>

      <!-- Terminal / Output -->
      <div class="h-48 bg-black text-gray-300 p-4 font-mono text-sm overflow-y-auto border-t border-gray-700">
        <div class="font-bold text-gray-500 mb-2 uppercase text-xs tracking-wider">Console Output</div>
        <pre class="whitespace-pre-wrap">{{ outputLog }}</pre>
      </div>
    </div>
  </div>
</template>

<style>
/* Custom Scrollbar for Editor Part */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1; 
}
::-webkit-scrollbar-thumb {
  background: #888; 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555; 
}
</style>
