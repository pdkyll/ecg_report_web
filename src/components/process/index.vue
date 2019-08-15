<template>
    <div class="flexBox" v-if="hackReset">
        <div class="singleBar">
            <img v-if="states[0].status === 'REPROCESSING' || states[0].status === 'UNPROCESSED'" src="../../assets/images/manHour/no.png" class="imgClass">
            <img v-if="states[0].status === 'PROCESSING'" src="../../assets/images/manHour/write.png" class="imgClass">
            <img v-if="states[0].status === 'PROCESSED'" src="../../assets/images/manHour/ok.png" class="imgClass">
            <p :class="states[0].status === 'UNPROCESSED' || states[0].status === 'REPROCESSING'? 'greyNormalWords':'colorNormalWords'">{{states[0].progress_name}}</p>
            <p class="timeWords">{{states[0].processor_name}}</p>
            <p class="timeWords">{{states[0].time}}</p>
        </div>
        <div style="float:left" v-for="(stateItem, index) in showStates.slice(1)">
            <div class="arrowBar">
                <img v-if="stateItem.status === 'REPROCESSING' || stateItem.status === 'UNPROCESSED'" src="../../assets/images/manHour/noProcess.png" style="width:100%">
                <img v-if="stateItem.status === 'PROCESSING'" src="../../assets/images/manHour/writeProcess.png" style="width:100%">
                <img v-if="stateItem.status === 'PROCESSED'" src="../../assets/images/manHour/okProcess.png" style="width:100%">
            </div>
            <div class="singleBar">
                <img v-if="stateItem.status === 'REPROCESSING' || stateItem.status === 'UNPROCESSED'" src="../../assets/images/manHour/no.png" class="imgClass">
                <img v-if="stateItem.status === 'PROCESSING'" src="../../assets/images/manHour/write.png" class="imgClass">
                <img v-if="stateItem.status === 'PROCESSED'" src="../../assets/images/manHour/ok.png" class="imgClass">
                <p :class="stateItem.status === 'UNPROCESSED' || stateItem.status === 'REPROCESSING' ? 'greyNormalWords':'colorNormalWords'">{{stateItem.progress_name}}</p>
                <p class="timeWords" v-if="stateItem.processor_name">{{stateItem.processor_name}}</p>
                <p class="timeWords" v-if="stateItem.time">{{stateItem.time}}</p>
            </div>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'ProcessBar',
        props: ['states'],
        data() {
            return {
                statesMapToSrc: [
                    '~/assets/images/manHour/no.png',
                    '~/assets/images/manHour/write.png',
                    '~/assets/images/manHour/ok.png'
                ],
                statesMapToProcessSrc: [
                    '~/assets/images/manHour/noProcess.png',
                    '~/assets/images/manHour/writeProcess.png',
                    '~/assets/images/manHour/okProcess.png'
                ],
                statesMapToWords: [
                    '上传完成',
                    '分析完成',
                    '标注中',
                    '审核中',
                    '已完成'
                ],
                showStates: [],
                hackReset: true
            }
        },
        mounted() {
            this.states.map((item, index) => {
                this.showStates[index] = item;
            });
            for (let i = 0; i < 6; i++) {
                if (this.showStates[i] === undefined) {
                    this.showStates[i] = {
                        status: 'UNPROCESSED'
                    }
                }
            }
            this.hackReset = false;
            this.$nextTick(() => {
               this.hackReset = true;
            });
        },
        watch: {
            states: function () {
                this.states.map((item, index) => {
                    this.showStates[index] = item;
                });
                for (let i = 0; i < 6; i++) {
                    if (this.showStates[i] === undefined) {
                        this.showStates[i] = {
                            status: 'UNPROCESSED'
                        }
                    }
                }
                this.hackReset = false;
                this.$nextTick(() => {
                    this.hackReset = true;
                });
            }
        }
    }
</script>
<style scoped>
    .flexBox {
        width: 900px;
        margin: 0 auto;
        overflow: hidden;
    }

    .singleBar {
        float: left;
        box-sizing: border-box;
        padding-top: 40px;
        width: 115px;
        height: 210px;
        overflow: hidden;
        text-align: center;
    }

    .imgClass {
        width: 58px;
    }

    .timeWords {
        color: #333;
    }

    .normalWords {
        color: #36353A;
        margin-top: 10px;
        font-size: 14px;
    }
    .greyNormalWords {
        color: #acacac;
        margin-top: 10px;
        font-size: 14px;
    }
    .colorNormalWords {
        color: #4979f7;
        margin-top: 10px;
        font-size: 14px;
    }

    .arrowBar {
        box-sizing: border-box;
        float: left;
        width: 40px;
        padding: 58px 0px;
        height: 150px;
    }
</style>
