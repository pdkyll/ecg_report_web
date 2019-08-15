<template>
    <div class="lateral-date-selector">
        <div style="display: flex">
            <el-button icon="el-icon-arrow-left" :disabled="datePageIndex===0"
                       @click="changeDatePage(false)"></el-button>
            <div class="data-list-box">
                <div class="date-list" :style="{marginLeft:marginLeftNum+'px'}" v-show="hackResetList">
                    <div v-for="(date,index) in dates" v-show="datesIsContainData[index]"
                         :class="{ active: index===currentActiveIndex }"
                         @click="dateItemClick(index, date)"
                    >
                        {{date}}
                    </div>
                </div>
            </div>
            <el-button
                    icon="el-icon-arrow-right"
                    :disabled="datePageIndex===datesPageNum"
                    @click="changeDatePage(true)">
            </el-button>
        </div>
    </div>
</template>
<script>
    import Util from '../../common/util';
    import {mapState, mapActions, mapMutations} from 'vuex';

    export default {
        name: 'LateralDateSelector',
        props: {
            dates: {
                type: Array,
                default: function () {
                    return []
                }
            },
            datesIsContainData: {
                type: Array,
                default: function () {
                    return []
                }
            },
            defaultActiveIndex: {
                type: Number,
                default: function () {
                    return 0
                }
            }
        },
        data() {
            return {
                datePageIndex: 0,//当前显示日期的页数,从0开始
                currentActiveIndex: this.defaultActiveIndex,
                hackResetList: true,
                selectDate: ''
            }
        },
        computed: {
            ...mapState('ecgView', {
                selectComponent: state => state.selectComponent,
                perDateData: state => state.perDateData,
                currentDate: state => state.currentDate,
                dateIndex: state => state.dateIndex
            }),
            datesPageNum: function () {
                let validLength = this.datesIsContainData.filter(v => v === true).length;
                if (validLength !== 0) {
                    return Math.floor((validLength - 1) / 7)
                } else {
                    return 0;
                }
            },
            marginLeftNum: function () {
                return -(this.datePageIndex * 777)
            }
        },
        methods: {
            changeDatePage(next) {
                if (next) {
                    if (this.datePageIndex < this.datesPageNum) {
                        this.datePageIndex++;
                    }
                } else {
                    if (this.datePageIndex > 0) {
                        this.datePageIndex--;
                    }
                }
            },
            dateItemClick(index, date) {
                this.selectDate = date;
                if (this.currentActiveIndex !== index) {
                    this.currentActiveIndex = index;
                    this.$emit('change', index);
                }
            }
        },
        created() {

        },
        mounted() {
            let firstValidIndex = Util.firstExistDataIndex(this.datesIsContainData);
            this.selectDate = this.dates[firstValidIndex];
        },
        watch: {
            datesIsContainData() {
                this.currentActiveIndex = this.dateIndex;
            },
            currentDate() {
                this.currentActiveIndex = this.dateIndex;
            }
        },
    }
</script>
<style scoped lang="scss">
    .date-list {
        display: flex;
        list-style: none;
        font-size: 14px;
        border: 1px solid #ccc;
        transition: margin-left .5s;
    }

    .date-list > div {
        width: 110px;
        height: 40px;
        line-height: 40px;
        text-align: center;
        background-color: #fff;
        border-right: 1px solid #ccc;
        flex-shrink: 0;
        cursor: pointer;
    }

    .data-list-box {
        width: 778px;
        overflow: hidden;
    }

    .active {
        color: #1f32de;
    }
</style>