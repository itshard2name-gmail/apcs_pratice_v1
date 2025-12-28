<script setup>
import { ref } from 'vue'

const form = ref({
  title: '',
  content: '',
  code_snippet: '',
  options: ['', '', '', ''],
  answer_index: 0,
  explanation: ''
})

const submitting = ref(false)
const generating = ref(false)
const message = ref('')
const generateTopic = ref('')
const showGenModal = ref(false)

// Bulk Generation State
const showBulkModal = ref(false)
const bulkConfig = ref({
    topic: '', // Empty = Random
    count: 3
})
const generatedList = ref([]) // Array of questions to review
const TOPIC_OPTIONS = [
    "Basic IO & Variables",
    "Control Structures",
    "Arrays & Strings",
    "Functions & Recursion",
    "Pointers & Memory",
    "Data Structures",
    "Algorithms"
]

const openGenModal = () => {
  showGenModal.value = true
  generateTopic.value = ''
}

const openBulkModal = () => {
    showBulkModal.value = true
    bulkConfig.value = { topic: '', count: 3 }
}

const generateQuestion = async () => {
    if (!generateTopic.value) return
    generating.value = true
    try {
        const res = await fetch('/api/ai/generate-question', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ topic: generateTopic.value })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        
        form.value = data
        showGenModal.value = false
        message.value = 'AI generated a question for you!'
    } catch (e) {
        alert('AI Generation Failed: ' + e.message)
    } finally {
        generating.value = false
    }
}

const generateBatch = async () => {
    generating.value = true
    try {
        const payload = {
            count: bulkConfig.value.count,
            topic: bulkConfig.value.topic === 'custom' ? bulkConfig.value.customTopic : bulkConfig.value.topic
        }

        const res = await fetch('/api/ai/generate-batch', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        
        // Add status to each item
        generatedList.value = data.map(q => ({ ...q, saved: false, error: null }))
        showBulkModal.value = false
    } catch (e) {
        alert('Batch Generation Failed: ' + e.message)
    } finally {
        generating.value = false
    }
}

const saveFromBatch = async (index) => {
    const item = generatedList.value[index]
    if (item.saved) return

    try {
        // Remove UI-only flags
        const { saved, error, ...payload } = item
        
        const res = await fetch('/api/questions/concept', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) throw new Error('Failed to save')
        
        generatedList.value[index].saved = true
    } catch (e) {
        generatedList.value[index].error = 'Save failed'
    }
}

const fillFormFromBatch = (index) => {
    const { saved, error, ...questionData } = generatedList.value[index]
    form.value = JSON.parse(JSON.stringify(questionData)) // Deep copy
    message.value = 'Loaded question from batch list.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

const removeBatchItem = (index) => {
    generatedList.value.splice(index, 1)
}

const submit = async () => {
  submitting.value = true
  message.value = ''
  try {
    const res = await fetch('/api/questions/concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (res.ok) {
      message.value = 'Question created successfully!'
      form.value = {
        title: '',
        content: '',
        code_snippet: '',
        options: ['', '', '', ''],
        answer_index: 0,
        explanation: ''
      }
    } else {
      message.value = 'Error creating question'
    }
  } catch (e) {
    message.value = 'Network error'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow relative">
    <div class="flex justify-between items-center mb-6">
       <h1 class="text-2xl font-bold">Create Concept Question</h1>
       <div class="flex gap-2">
           <button 
             @click="openGenModal"
             type="button"
             class="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-purple-700">
             <span>✨ Single AI</span>
           </button>
           <button 
             @click="openBulkModal"
             type="button"
             class="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-indigo-700">
             <span>🚀 Bulk Generate</span>
           </button>
       </div>
    </div>

    <!-- Single AI Modal -->
    <div v-if="showGenModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded shadow-lg w-96">
            <h3 class="font-bold text-lg mb-2">Generate with AI</h3>
            <p class="text-sm text-gray-600 mb-4">Enter a topic (e.g. "Recursion") and AI will draft a question.</p>
            <input v-model="generateTopic" placeholder="e.g. Binary Search" class="w-full border p-2 rounded mb-4" @keyup.enter="generateQuestion" />
            <div class="flex justify-end gap-2">
                <button @click="showGenModal = false" class="text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancel</button>
                <button 
                  @click="generateQuestion" 
                  :disabled="generating"
                  class="bg-purple-600 text-white px-4 py-1 rounded font-bold hover:bg-purple-700 disabled:opacity-50">
                  {{ generating ? 'Generating...' : 'Generate' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Bulk AI Modal -->
    <div v-if="showBulkModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded shadow-lg w-96 relative">
            <h3 class="font-bold text-lg mb-2 mr-3">🚀 Bulk Generate Questions</h3>
            
            <div v-if="generating" class="flex flex-col items-center justify-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p class="text-indigo-600 font-bold mb-2">Generating content...</p>
                <p class="text-xs text-gray-500 text-center">This may take 10-20 seconds.<br>Please do not close this window.</p>
            </div>

            <div v-else>
                <div class="mb-4">
                    <label class="block text-sm font-bold mb-1">Topic</label>
                    <select v-model="bulkConfig.topic" class="w-full border p-2 rounded mb-2">
                        <option value="">🎲 Random (Mixed Topics)</option>
                        <option v-for="t in TOPIC_OPTIONS" :key="t" :value="t">{{ t }}</option>
                        <option value="custom">Other (Manual Entry)</option>
                    </select>
                    <input v-if="bulkConfig.topic === 'custom'" v-model="bulkConfig.customTopic" placeholder="Enter custom topic..." class="w-full border p-2 rounded" />
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold mb-1">Quantity</label>
                    <select v-model="bulkConfig.count" class="w-full border p-2 rounded">
                        <option :value="3">3 Questions</option>
                        <option :value="5">5 Questions</option>
                        <option :value="10">10 Questions</option>
                    </select>
                </div>

                <div class="flex justify-end gap-2">
                    <button @click="showBulkModal = false" class="text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancel</button>
                    <button 
                      @click="generateBatch" 
                      class="bg-indigo-600 text-white px-4 py-1 rounded font-bold hover:bg-indigo-700">
                      Start Generation
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Bulk Review Section -->
    <div v-if="generatedList.length > 0" class="mb-8 border-b pb-8">
        <h2 class="text-xl font-bold mb-4 text-indigo-700">Review Batch Generated Questions</h2>
        <div class="grid gap-4">
            <div v-for="(q, idx) in generatedList" :key="idx" class="border p-4 rounded bg-gray-50 flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="bg-gray-200 text-xs px-2 py-0.5 rounded font-mono">{{ idx + 1 }}</span>
                        <h4 class="font-bold text-lg">{{ q.title }}</h4>
                    </div>
                    <p class="text-sm text-gray-600 line-clamp-2">{{ q.content }}</p>
                </div>
                <div class="flex flex-col gap-2 ml-4">
                    <button 
                        v-if="!q.saved"
                        @click="saveFromBatch(idx)" 
                        class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 whitespace-nowrap">
                        Check & Save
                    </button>
                    <button 
                        v-else 
                        class="bg-gray-400 text-white px-3 py-1 rounded text-sm cursor-not-allowed whitespace-nowrap">
                        Saved ✓
                    </button>
                    
                    <button @click="fillFormFromBatch(idx)" class="text-blue-600 text-sm hover:underline">Edit First</button>
                    <button @click="removeBatchItem(idx)" class="text-red-500 text-sm hover:underline">Discard</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Form -->
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Title</label>
        <input v-model="form.title" class="w-full border p-2 rounded" type="text" placeholder="e.g. C Pointer Basics">
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Content (Question Text)</label>
        <textarea v-model="form.content" class="w-full border p-2 rounded" rows="3"></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Code Snippet (Optional)</label>
        <textarea v-model="form.code_snippet" class="w-full border p-2 rounded font-mono text-sm bg-gray-50" rows="4"></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Options</label>
        <div v-for="(opt, idx) in form.options" :key="idx" class="flex gap-2 mb-2">
          <span class="font-bold w-6 pt-2">{{ String.fromCharCode(65 + idx) }}</span>
          <input v-model="form.options[idx]" class="w-full border p-2 rounded" type="text">
          <input type="radio" :value="idx" v-model="form.answer_index" name="answer">
        </div>
        <p class="text-xs text-gray-500">Select the radio button for the correct answer.</p>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Explanation</label>
        <textarea v-model="form.explanation" class="w-full border p-2 rounded" rows="2"></textarea>
      </div>
      
      <div v-if="message" :class="message.includes('Error') ? 'text-red-600' : 'text-green-600'">
        {{ message }}
      </div>
      
      <button 
        @click="submit" 
        :disabled="submitting"
        class="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
        {{ submitting ? 'Saving...' : 'Create Question' }}
      </button>
       <router-link to="/concept" class="ml-4 text-gray-600">Cancel</router-link>
    </div>
  </div>
</template>
