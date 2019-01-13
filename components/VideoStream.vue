<template>
  <div class="page">
    <b-message auto-close title="Error!" type="is-danger" has-icon :active.sync="isError">
      {{error}}
    </b-message>

    <section class="section" v-show="url">
      <div class="container">
        <b-collapse :open="false">
            <button class="button is-primary" slot="trigger">Servo Controll</button>
            <div class="notification">
              <button class="button is-warning" @click="publishservo(1000)">
                <i class="fas fa-stop"></i>
                <span>Stop</span>
              </button> 
              <button class="button is-info" @click="publishservo(1750)">
                <i class="fas fa-play"></i>
                <span>Shoot</span>
              </button> 
            </div>
        </b-collapse>
      </div>
    </section>

    <div class="turtle-video tile is-ancestor" v-show="url">
      <div class="tile is-ancestor">
        <div class="tile is-parent">
          <div class="columns">
            <div class="column">&nbsp;</div>
            <div class="column">
              <article class="tile is-child box">
              <video id="turtlevideo" width="320" class="video-js vjs-default-skin" controls autoplay></video>
              </article>
            </div>
            <div class="column">&nbsp;</div>
          </div>
        </div>
        <div class="tile is-parent">
          <article class="tile is-child box">
            <vue-c3 :handler="handler"></vue-c3>
            <b-table :data="tempdata" :columns="tempcolumns"></b-table>
          </article>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="notification">
        <p>{{ status }}</p>
        <p><strong>{{ message_text }}</strong> </p>
        <h1 v-if="info"><code>{{info}}</code></h1>
      </div>
    </div>

    <div class="message">
    </div>
 
    <div class="login-form container" v-show="login == false">
      <div class="columns">
        <div class="column">&nbsp;</div>
        <div class="column">
          <b-field label="User" potision="is-centered" grouped>
            <b-input placeholder="id"
                icon="account"
                size="is-small"
                v-model="userInfo.username"
            >
            </b-input>
          </b-field>

          <b-field label="Passwd" grouped>
            <b-input type="password"
                placeholder="Regular password input"
                size="is-small"
                v-model="userInfo.password">
            </b-input>
          </b-field>
        </div>
        <div class="column">&nbsp;</div>
      </div>

      <div class="columns">
        <div class="column">&nbsp;</div>
        <div class="column">
          <b-field>
            <p class="control">
              <button position="is-centered" class="button is-primary" @click="signIn()">ログイン</button>
            </p>
          </b-field>
        </div>
        <div class="column">&nbsp;</div>
      </div>
    </div>

    <div class="logout-form" v-show="login">
        <button class="button" @click="signOut()">ログアウト</button>
        <button class="button is-success" @click="play()">再生</button>
    </div>

  </div>
</template>

<script>
import Amplify, { Auth, Storage, Logger, API, graphqlOperation } from 'aws-amplify'
import aws_exports from '../js/aws-exports'; 
import awsmobile from '../js/awsmobile'; 
import videojs from 'video.js';
import 'videojs-contrib-hls';
import 'video.js/dist/video-js.css'
Amplify.configure(awsmobile);
Auth.configure(aws_exports);
API.configure(aws_exports);
import * as queries from '../graphql/queries';
import Vue from 'vue'
import VueC3 from 'vue-c3';
import 'c3/c3.min.css'
import moment from 'moment'

Vue.use(require('vue-moment'));

export default {
  components: {
    VueC3
  },
  data () {
    return {
      isError: false,
      error: '',
      res: [],
      handler: new Vue(),
      login: false,
      info: '',
      initialized: false,
      streams: {
        hls: ''
      },
      html5: { hls: { withCredentials: true } },
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
      player: '',
      tempdata: [],
      tempcolumns: [
        {
          field: 'date',
          label: 'Date'
        },
        {
          field: 'd1',
          label: '温',
          numeric: true,
          width: 80
        },
        {
          field: 'd2',
          label: '湿',
          numeric: true,
          width: 80
        }
      ]
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
        this.login = true;
      }).catch((err) => {
        this.status = 'ログインに失敗しました'
        this.message_text = '';
        this.login = false;
      });
    },
    signOut: function () { 
      Auth.signOut()
      .then((data) => {
        this.status = 'ログアウトしました'
        this.message_text = '';
        this.url = '';
        this.login = false;
      }).catch((err) => {
        this.status = 'ログアウトに失敗しました'
        this.message_text = '';
        this.login = true;
      });
    },
    play: async function() {
      const self = this
      Auth.currentSession()
        .then(session => session.idToken.jwtToken)
        .then(token => API.get('RaspiStream', '/',
            {
                "headers":{"Authorization":token, "Content-Type": 'application/json'},
                "queryStringParameters": {}
            }
        ))
        .then(res => res.body)
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
            self.measurements();
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
    },
    measurements: async function() {
      const self = this
      let _filter = {"expire": {'ge' : (new Date() + 36 * 3600 ) * 0.001}, "limit": (60/5) * 12} 
      let _res = await API.graphql(graphqlOperation(queries.listMeasurements, _filter))
      self.res = []
      for (let d of _res.data.listKamekusaDht22S.items){
        let j = JSON.parse(d.payload)
        let dt = new Date((parseInt(j.expire) - 48 * 3600) * 1000)
        let month = ( dt.getMonth()+1 < 10 ) ? '0' + (dt.getMonth()+1).toString()   : dt.getMonth() + 1
        let day = ( dt.getDate()   < 10 ) ? '0' + dt.getDate()   : dt.getDate()
        let hour = ( dt.getHours()   < 10 ) ? '0' + dt.getHours()   : dt.getHours()
        let min = ( dt.getMinutes()   < 10 ) ? '0' + dt.getMinutes()   : dt.getMinutes()
        let sec = ( dt.getSeconds()   < 10 ) ? '0' + dt.getSeconds()   : dt.getSeconds()
        j.date = month + '-' + day + ' ' + hour + ':' +  min
        j.fulldate = dt.getFullYear() + '-' + month + '-' + day + 'T' + hour + ':' +  min + ':' + sec
        self.res.push(j)
      }
      console.log(self.res)
      self.res.sort((a,b) => {
        if(parseInt(a.expire) > parseInt(b.expire)) return -1
        if(parseInt(a.expire) < parseInt(b.expire)) return 1
        return 0
      })
      self.tempdata = self.res.slice(0,20)
      self.updateGraph(self.res.slice(0,50))
    },
    updateGraph(jsons) {
      let x = ['x']
      let d1 = ['温']
      let d2 = ['湿']
      for (let j of jsons){
        //x.push(j.date)
        x.push(j.fulldate)
        d1.push(j.d1)
        d2.push(j.d2)
      }
      const options = {
        data: {
          x: 'x',
          xFormat: '%Y-%m-%dT%H:%M:%S',
          columns: [x,d1,d2],
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: {
                format: '%d %H:%M',
                rotate: 75
            }
          }
        },
        type: 'spline'
      }
      this.handler.$emit('init', options)
    },
    publishservo: function(angle) {
      self = this;
      console.log(angle)
      Auth.currentSession()
        .then(session => session.idToken.jwtToken)
        .then(token => API.get('RaspiStream', '/mqtt/' + angle.toString(),
            {
                "headers":{"Authorization":token, "Content-Type": 'application/json'}
            }
        ))
        .then(function(response){ self.dialogAlert('publish success!')})
        .catch(err => function(err){this.error = err});
    },
    dialogAlert: function(mess){
      this.$dialog.alert(mess);
    }
  }
}
</script>
<style scoped>
  .login-form {
    margin: 20;
  }
  .page {
    width: 100%;
  }
  .turtle-video {
    width: 100%;
  }
  #turtleVideo{
    min-width: 100%;
    min-width: 100vw;
  }
  .c3-graph {
    min-height: 150px;
  }
</style>
