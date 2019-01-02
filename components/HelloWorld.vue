<template>
  <div class="page">

    <div class="turtle-video" v-show="url">
      <video id="turtlevideo" height="480" width="640" class="video-js vjs-default-skin" controls autoplay></video>
    </div>

    <div class="message">
      <p>{{ status }}</p>
      <p>{{ message_text }} </p>
    </div>
 
    <div class="login-form">
      <p>ログイン</p>
      <h1 v-if="info">{{info}}</h1>
      <label>ユーザー名</label>
      <input type="text" v-model="userInfo.username"/>
      <label>パスワード</label>
      <input type="password" v-model="userInfo.password"/>
      <button class="btn btn-primary" @click="signIn()">ログイン</button>
    </div>
    <button class="btn btn-primary" @click="play()">再生</button>
  </div>
</template>

<script>
import Amplify, { Auth, Storage, Logger, API } from 'aws-amplify'
import aws_exports from '../aws-exports'; 
import videojs from 'video.js';
import 'videojs-contrib-hls';
import 'video.js/dist/video-js.css'
Amplify.configure(aws_exports);

export default {
  data () {
    return {
      info: '',
      initialized: false,
      streams: {
        hls: ''
      },
      html5: { hls: { withCredentials: false } },
      status: '',
      token: '',
      userInfo: {
        username: '',
        password: '',
      },
      message_text: '',
      url: '',
      playerOptions: {
        overNative: true,
        autoplay: false,
        controls: true,
        techOrder: ['html5'],
        sourceOrder: true,
        sources: [{
          type: 'application/x-mpegURL',
          src: ''
        }]
      },
      player: ''
    };
  },
  computed: {
  },
  created() {
    Auth.currentSession()
    .then((data) => {
      this.token = Auth.currentSession().idToken.jwtToken
      this.status = 'ログインしています'
    }).catch((err) => {
      this.status = 'ログインしていません'
    });
  },
  methods:{
    signIn: function () { 
      Auth.signIn(this.userInfo.username, this.userInfo.password)
      .then((data) => {
        this.message_text = 'ログインしました';
        this.status = 'こんにちは、'+data.username+'さん';
      }).catch((err) => {
        this.message_text = '';
      });
    },
    play: async function() {
      const self = this
      Auth.currentSession()
        .then(session => session.idToken.jwtToken)
        .then(token => API.get('RaspiStream', '/',{"headers":{"Authorization":token}}))
        .then(response => response.body)
        .then(function(url){
            console.log(url);
            self.url = url;
            self.player = videojs('turtlevideo');
            self.player.src({
                src: url,
                type: 'application/x-mpegURL'
            });
            //self.playerOptions.sources[0].src = url;
            self.player.play();
        })
        .catch(err => console.log(err));
    },
    onPlayerReadied() {
      if (!this.initialized) {
        this.initialized = true
      }
    },
    // record current time
    onTimeupdate(e) {
      console.log('currentTime', e.cache_.currentTime)
    },
    enterStream() {
      this.playerOptions.sources[0].src = this.streams.hls
      this.playerOptions.autoplay = false
    }
  }
}
</script>
<style scoped>
  .login-form {
    margin: 20;
  }
</style>
