<template>
    <div>
        <el-select
                v-if="hackresetSelect && hasSelect"
                v-model="selectType" placeholder="请选择" @change="editSelectBeat"
                style="width: 130px;vertical-align: text-bottom;margin-right: 5px;">
            <el-option
                    v-for="item in vsCountOptions.selectTypeOption"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value">
            </el-option>
        </el-select>
        <div class="buttonClass" style="display: inline-block;vertical-align: text-bottom">
            <BeatStatisticsBtns
                    :direction="direction"
                    :data="vsCountOptions.beatsData"
                    :defaultActiveIndex="defaultActiveIndex"
                    @change="beatTypeSelect"
                    v-if="hackresetBeat"
            />
        </div>
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import BeatStatisticsBtns from '../../components/common/BeatStatisticsBtns.vue';

    export default {
        name: 'SelectTypeAside',
        components: {
            BeatStatisticsBtns
        },
        props: {
            hasSelect: {
                type: Boolean,
                default: true
            },
            direction: {
                type: String,
                default: 'horizontal'
            },
            defaultIndex: {
                type: Number,
                default: -1
            }
        },
        data() {
            return {
                defaultActiveIndex: this.defaultIndex,
                hackresetBeat: true,
                hackresetSelect: true,
                selectType: 'ALL'
            }
        },
        watch: {
            vsCountOptions: {
                deep: true,
                handler() {
                    this.hackresetSelect = false;
                    this.$nextTick(() => {
                        this.hackresetSelect = true;
                    })
                }
            }
        },
        computed: {
            ...mapState('ecgView', {
                validDates: state => state.validDates,
                datesIsContainData: state => state.datesIsContainData,
                selectComponent: state => state.selectComponent,
                currentDate: state => state.currentDate,
                tagChangeState: state => state.tagChangeState,
                vsCountOptions: state => state.vsCountOptions
            }),
        },
        methods: {
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
            ...mapMutations('ecgView', [
                'changeCurrentDateTags',
                'changePerDayData',
                'changeCurrentDate',
                'changeTagState',
                'changeShowEmpty',
            ]),
            editSelectBeat(item) {
                this.defaultActiveIndex = -1;
                this.$emit('changeSelectType', item);
                this.hackresetBeat = false;
                this.$nextTick(() => {
                    this.hackresetBeat = true;
                })
            },
            /**
             * 修改选中类型
             * @param item
             */
            beatTypeSelect(item) {
                this.selectType = '';
                this.$emit('changeSelectType', item);
            },
        }
    }
</script>