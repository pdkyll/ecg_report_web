import {mapState, mapMutations, mapActions} from 'vuex';
import {bus} from '../bus';
import Util from '../../src/common/util';

export default {
    data: function () {
        return {
            websocket: null,
            websocketConnectState: false
        };
    },
    computed: {},
    watch: {
        loading(loading) {
            if (!loading && this.websocketConnectState) {
                console.log('重新向服务端发送websocket消息');
                this.websocketSendInfo();
            }
        }
    },
    methods: {
        initWebsocket() {
            this.websocket = new ReconnectingWebSocket(Util.wsUrl.local);
            this.websocket.onopen = this.websocketOnOpen;
            this.websocket.onmessage = this.websocketOnMessage;
            this.websocket.onclose = this.websocketOnClose;
            var registerHeartBeat = () => {
                setTimeout(
                    () => {
                        if (this.websocket) {
                            this.websocket.send(JSON.stringify({type: 'HEARTBEAT',userId:JSON.parse(localStorage.getItem('access-user')).user_id}));
                            registerHeartBeat()
                        }
                    },
                    10 * 1000
                );
            };
            registerHeartBeat();
        },
        websocketSendInfo() {
            let sendInfo = {type: 'SUBSCRIBE_REPORT_PROGRESS', reportIds: [],userId:JSON.parse(localStorage.getItem('access-user')).user_id};
            if (this.users) {
                this.users.forEach((user) => {
                    if (user.report_state === 'WAIT_FOR_ANALYZE' || user.report_state === 'ANALYZING') {
                        sendInfo.reportIds.push(user.record_id);
                    }
                });
                console.log(sendInfo);
                this.websocket.send(JSON.stringify(sendInfo));
            }
        },
        websocketOnOpen() {
            console.log('ai进度websocket连接成功!');
            this.websocketConnectState = true;
            this.websocketSendInfo();
        },
        websocketOnMessage(res) {
            console.log('收到ai进度消息！');
            const data = JSON.parse(res.data);
            if (data.type === 'NOTIFICATION') {
                bus.$emit('sendNotification');
            }
            if (this.filters) {
                if ((this.filters.report_states === 'WAIT_FOR_ANALYZE') || (this.filters.report_states === 'ANALYZING' && data.progress === 100)) {
                    setTimeout(() => {
                        this.search();
                    }, 5000);
                } else {
                    this.users = this.users.map(user => {
                        if (user.record_id === data.reportId) {
                            return {
                                ...user,
                                report_state: data.progress === 100 ? 'WAIT_FOR_EDIT' : 'ANALYZING',
                                report_state_desc: data.progress === 100 ? null : `${data.progress}%`,
                            }
                        } else {
                            return user
                        }
                    });
                }
            }
        },
        websocketOnClose() {
            this.websocket.close();
        }
    },
    beforeDestroy() {

    },
    mounted() {

    }
};