<template>
    <div class="buttonClass" style="display: inline-block;vertical-align: text-bottom">
        <el-button class="normalButton"
                   style="text-align: left;margin-right: 3px"
                   v-for="(item,index) in beatTypes"
                   :key="item"
                   :style="{color:beatTypeColorMap[item],display: direction === 'vertical'?'block':'auto',marginTop: direction === 'vertical' && index !== 0?'20px':'0px'}"
                   :class="{dashBorder:currentActiveIndex===index}"
                   @click="beatBtnClick(item,index)"
        >
            <i style="position: relative;top: -11px;left: -3px">{{item}}</i>
            <p class="footCount">{{data[item]}}</p>
        </el-button>
    </div>
</template>
<script>
    export default {
        name: 'BeatStatisticsBtns',
        props: {
            direction: {
                type: String,
                default:'horizontal'
            },
            data: {
                type: Object,
                // 对象或数组默认值必须从一个工厂函数获取
                default: function () {
                    return {
                        N: 0,
                        V: 0,
                        S: 0,
                        Q: 0
                    }
                }
            },
            defaultActiveIndex: {
                type: Number,
                default: 0
            }
        },
        data() {
            return {
                beatTypes: [
                    'N', 'V', 'S', 'Q'
                ],
                beatTypeColorMap: {
                    N: '#2d2d2d',
                    V: '#fe010f',
                    S: '#12d726',
                    Q: '#6f6f6f'
                },
                currentActiveIndex: this.defaultActiveIndex
            }
        },
        methods: {
            beatBtnClick(item, index) {
                if (this.currentActiveIndex !== index) {
                    this.currentActiveIndex = index;
                    this.$emit('change', item);
                }
            },
            reset() {
                this.currentActiveIndex = 0;
            }
        }
    }
</script>
<style scoped lang="scss">
    .normalButton {
        position: relative;
        width: 56px;
        height: 38px;
        box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, .2);
        font-size: 24px;
        font-weight: 600;
    }
    .buttonClass {
        box-sizing: border-box;
    }

    .dashBorder {
        border: 1px dashed red;
    }

    .buttonClass .el-button + .el-button {
        margin-left: 0;
    }

    .footCount {
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: -2px;
        left: 0;
        color: #000;
        font-size: 14px;
    }
</style>
