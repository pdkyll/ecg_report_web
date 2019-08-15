<template>
    <div class="block" :style="{'width': width + 'px'}">
        <el-slider v-model="value" :max="maxValue" :min="minValue" @change="change" :format-tooltip="formatTooltip"></el-slider>
    </div>
</template>
<script type="text/ecmascript-6">
    import Util from '../../common/util'
    import {mapState, mapMutations, mapActions} from 'vuex';
    export default {
        props: {
            width: {
                type: Number,
                default: 1550
            }
        },
        data() {
            return {
                value: 0
            }
        },
        computed: {
            ...mapState('ecgView', {
                startBlockIndex: state => state.startBlockIndex,
                lastBlockIndex: state => state.lastBlockIndex,
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime
            }),
            minValue() {
                return this.startBlockIndex*60* 512
            },
            maxValue() {
                return this.lastBlockIndex*60* 512
            }
        },
        methods: {
            change(value) {
                this.$emit('changePosition', value)
            },
            changeValue(value) {
                this.value = value
            },
            formatTooltip(val) {
                return ((val - this.minValue) * 100 / ((this.maxValue- this.minValue))).toFixed(2)+ '%';
            }
        }
    }
</script>
<style type="text/css" scoped lang="scss">
    /*.block {*/
        /*margin: auto;*/
    /*}*/
</style> 