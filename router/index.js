import Vue from 'vue'
import Router from 'vue-router'
import VideoStream from '@/components/VideoStream'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'VideoStream',
      component: VideoStream
    }
  ]
})

