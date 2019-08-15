<template>
    <div ref="content" @mouseleave="animateRetract" class="content" @click.stop v-loading="loading" :style="{'height':wrapperSize.height + 'px','width':wrapperSize.width+ 'px' }">
        <!--<div class="slideBox" ref="slideBox"></div>-->
        <div :style="{'width': blockSize.width+ 'px'}" v-show="!isShowTempList" @mouseenter="animateOpen">
            <p class="block-item-head" :style="{'background': activeIndex === -1?'#3b96c5': '#ff8000'}">
                <span class="flex1" style="text-align: left">{{activeTemp.len}}</span>
                <span class="flex1">{{activeTemp.type}}</span>
                <span class="flex1" style="text-align: right">{{activeTemp.clusterId === -1?'临时模板': activeTemp.clusterId}}</span>
            </p>
        </div>
        <div ref="wrapper" v-show="isShowTempList" class="block-wrapper clearfix" :style="{'overflow-x':direction === 'horizontal'?'auto': 'hidden','overflow-y':direction === 'horizontal'?'hidden': 'auto'}">
            <div
                v-for="(item, index) in classifiedData"
                :key="JSON.stringify(item)"
                ref="block"
                class="block"
                draggable="true"
                :class="'block'+index"
                :data-index="index"
                :data-id="item.clusterId"
                :style="{'height': blockSize.height + 'px','width':blockSize.width+'px','display': direction === 'horizontal'?'inline-block': 'block'}"
            >
                <div class="block-item" ref="blockItem"
                     :class="{'blockActive': index === activeIndex, 'moveActive': index === moveToIndex}"
                     draggable="true">
                    <p class="block-item-head">
                        <span class="flex1">{{item.len}}</span>
                        <span class="flex1">{{item.type}}</span>
                        <span class="flex1" style="text-align: right">{{item.clusterId === -1?'临时模板': item.clusterId}}</span>
                    </p>
                    <div class="block-item-content flex1">
                        <p class="cut-icon icon" v-if="item.updated">C</p>
                        <p class="add-icon icon" v-if="item.clusterId === -1">+</p>
                        <div class="thumbnailBox" ref="thumbnailBox">
                            <canvas class="thumbnail" :ref="'thumbnail'+ index" :width="canvasWidth" :height="parseInt(canvasHeight)" ></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <ul class="tempPopup" ref="tempPopup" v-show="isShowTempPopup">
            <li v-for="(item, index) in options" :key="index" @click="handleChangeBeatType(item)">{{item.label}}
            </li>
        </ul>
    </div>
</template>
<script type="text/ecmascript-6">
import BLOCK_API from '../../api/api_block_view';
import API from '../../api/api_ecg_view'
import Util from '../../common/util'
import {mapState, mapMutations, mapActions} from 'vuex';

const SCROLL_DISTANCE = 5
const NAVIGATION_HEIGHT = 50
const FREQUENCY = parseInt(512*0.7, 10) // 控制缩略图是0.7s的心电片段
export default {
    props: {
        defaultSelectAll: {
            type: Boolean,
            default: false
        },
        isAnimate: {
            type: Boolean,
            default: false
        },
        direction: {
            type: String,
            default:'vertical'
        },
        isResetActive: {
            type:  Number,
            default: 0
        },
        currentBeatType: {
            type: String,
            default: ''
        },
        currentBeats: {
            type: Array,
            default: function () {
                return []
            }
        },
        canvasWidth: {
          type: Number,
          default: 38
        },
        wrapperSize: {
            type: Object,
            default: function () {
                return {height: '400', width: '200'}
            }
        },
        visibleNumber: {
            type: Number,
            default: 3
        }
    },
    data() {
        return {
            isOpen: true,
            activeTemp: {},
            isShowTempList: true,
            activeId: null,
            canvasHeight: 0,
            blockSize: {height: 0, width: 0},
            moveToIndex: -1,
            loading: false,
            isShowTempPopup: false,
            options: [
                {value: 'N', label: 'N', type: 'SELF'},
                {value: 'V', label: 'V', type: 'SELF'},
                {value: 'S', label: 'S', type: 'SELF'},
                {value: 'Q', label: 'Q', type: 'SELF'},
            ],
            report_id: localStorage.getItem('report_id'),
            mouseStartP: 0, // 计算距离差 用于区分模板列表的点击事件和拖拽事件
            mouseEndP: 0,
            classifiedData: [], // 所有的分类数据
            activeIndex: -1,
            currentNode: {}, // 当前拖动的dom元素的拷贝
            rangeArr: [], // 存储每个div距离父级上边距的距离，用于放手时的位置判断
            mouseFlag: false,
            wrapper: {
                x: 0,
                y: 0
            },
            start: {
                x: 0,
                y: 0
            }
        }
    },
    watch: {
        currentBeats() {
            this.direction === 'horizontal'? $(this.$refs.wrapper).scrollTop(0): $(this.$refs.wrapper).scrollLeft(0)
            if (this.isAnimate) {
                this.resetAnimate()
            }
            this.loadTempList()
//            else {
//                let tempArr = [],classifiedDataBak = []
//                classifiedDataBak = Util.deepCopy(this.classifiedData)
//                let indexTemporary = this.classifiedData.findIndex((v, i) => {
//                    return v.clusterId === -1
//                })
//                if (indexTemporary === -1) {
//                    classifiedDataBak.push({clusterId: -1,updated: true,wave: []})
//                }
//                classifiedDataBak.forEach((v, i) => {
//                    let temp = this.getTempPositions(v, this.currentBeats)
//                    if (temp) {
//                        tempArr.push(temp)
//                    }
//                })
//                this.classifiedData = tempArr
//                let index = this.classifiedData.findIndex((v) => {
//                    return this.activeId === v.clusterId
//                })
//                if (index === -1) {
//                    index = 0
//                    this.direction === 'horizontal'? $(this.$refs.wrapper).scrollLeft(0): $(this.$refs.wrapper).scrollTop(0)
//                }
//                this.calcEmitP(index)
//                this.getDivsRange()
//            }
        }
    },
    computed: {
        ...mapState('ecgView', {
            currentDate: state => state.currentDate,
            wholeViewLoading: state => state.wholeViewLoading
        })
    },
    created() {
        if (this.direction === 'vertical') {
            this.blockSize.height = this.wrapperSize.height / this.visibleNumber
            this.blockSize.width = this.wrapperSize.width
            this.canvasHeight = this.wrapperSize.height/this.visibleNumber - 20 - 25
        } else if(this.direction === 'horizontal'){
            this.blockSize.height = this.wrapperSize.height
            this.blockSize.width = this.wrapperSize.width / this.visibleNumber
            this.canvasHeight = this.wrapperSize.height - 20 - 25
        }
    },
    mounted() {
        [this.wrapper.x, this.wrapper.y] = [$(this.$refs.wrapper).offset().left, $(this.$refs.wrapper).offset().top];
    },
    activated() {
        this.bindEvent()
    },
    deactivated() {
        $(document).off('mousemove', this.documentMouseMove)
        $(document).off('mouseup', this.documentMouseUp)
        $(this.$refs['wrapper']).off()
    },
    methods: {
        ...mapActions('ecgView', [
            'changeVSTagData'
        ]),
        ...mapMutations('ecgView', [
            'changePerDayData',
            'changeViewLoadingState'
        ]),
        resetAnimate() {
            this.isOpen = true
            if (!this.isShowTempList) {
                $(this.$refs.content).css('height',this.wrapperSize.height + 'px')
            }
            this.isShowTempList = true
        },
        documentMouseUp(e) {
            e.preventDefault()
            if (this.mouseFlag) {
                this.mouseEndP = {x: e.clientX, y: e.clientY}
                if (this.mouseEndP.x !== this.mouseStartP.x || this.mouseEndP.y !== this.mouseStartP.y) {
                    if (this.moveToIndex !== -1) {
                        console.log(`form: ${this.currentNode.index} to ${this.moveToIndex}`)
                        this.moveTemp(this.currentNode.index, this.moveToIndex)
                    }
                    document.body.removeChild(this.cloneNode)
                    this.mouseFlag = false
                }
            }
        },
        documentMouseMove(e) {
            e.preventDefault()
            if (this.mouseFlag) {
                this.mouseEndP = {x: e.clientX, y: e.clientY}
                if (Math.abs(this.mouseEndP.x - this.mouseStartP.x) > 8 || Math.abs(this.mouseEndP.y - this.mouseStartP.y) > 8) {
                    let [left, top] = [e.clientX - this.start.x, e.clientY - this.start.y]
                    if (this.direction === 'vertical') {
                        if (top <= this.wrapper.y && $(this.$refs.wrapper).scrollTop() > SCROLL_DISTANCE) { // 往上滚动
                            $(this.$refs.wrapper).scrollTop($(this.$refs.wrapper).scrollTop() - SCROLL_DISTANCE)
                        } else if (top <= this.wrapper.y && 0 < $(this.$refs.wrapper).scrollTop() && $(this.$refs.wrapper).scrollTop() < SCROLL_DISTANCE) { // 滚到了顶部
                            $(this.$refs.wrapper).scrollTop(0)
                        } else if (top + this.blockSize.height > this.wrapper.y + this.wrapperSize.height) { // 往下滚动
                            $(this.$refs.wrapper).scrollTop($(this.$refs.wrapper).scrollTop() + SCROLL_DISTANCE)
                        }
                    } else {
                        if (left <= this.wrapper.x && $(this.$refs.wrapper).scrollLeft() > SCROLL_DISTANCE) { // 往左滚动
                            $(this.$refs.wrapper).scrollLeft($(this.$refs.wrapper).scrollLeft() - SCROLL_DISTANCE)
                        } else if (left <= this.wrapper.x && 0 < $(this.$refs.wrapper).scrollLeft() && $(this.$refs.wrapper).scrollLeft() < SCROLL_DISTANCE) { // 滚到了最左边
                            $(this.$refs.wrapper).scrollLeft(0)
                        } else if (left + this.blockSize.width > this.wrapper.x + this.wrapperSize.width) { // 往右滚动
                            $(this.$refs.wrapper).scrollLeft($(this.$refs.wrapper).scrollLeft() + SCROLL_DISTANCE)
                        }
                    }
                    $(this.cloneNode).css("cssText",`height:${this.blockSize.height}px;width:${this.blockSize.width}px;left:${left}px;top:${top}px;opacity:1 !important;`);
                    let index = -1, anotherResult = false
                    if (this.direction === 'vertical') {
                        let [x, y] = [$(this.cloneNode).offset().left, $(this.cloneNode).offset().top + this.blockSize.height / 2]
                        index = this.getIndexFromAreaVertical(y)
                        anotherResult = this.isInAreaVertical(x)
                    } else {
                        let [x, y] = [$(this.cloneNode).offset().left + this.blockSize.width / 2, $(this.cloneNode).offset().top]
                        index = this.getIndexFromAreaHorizontal(x)
                        anotherResult = this.isInAreaHorizontal(y)
                    }
                    index = index === null ? -1 : index
                    if (anotherResult && index !== -1) {
                        this.moveToIndex = index
                    } else {
                        this.moveToIndex = -1
                    }
                }
            }
        },
        bindEvent() {
            $(this.$refs['wrapper']).delegate('.block', 'mousedown', (e)=> {
                e.preventDefault()
                if (!this.mouseFlag) {
                    this.mouseStartP = {x: e.clientX, y: e.clientY}
                    this.startT = new Date()
                    this.mouseFlag = true
                    this.currentNode = {
                        node: e.currentTarget,
                        index: parseInt($(e.currentTarget).attr('data-index'), 10),
                        id: parseInt($(e.currentTarget).attr('data-id'), 10)
                    };
                    [this.start.x, this.start.y] = [e.offsetX, e.offsetY];
                    this.cloneNode = this.currentNode.node.cloneNode(true)
                    this.cloneNode.className = 'cloneBlock'
                    document.body.appendChild(this.cloneNode)
                    let canvas = $(e.currentTarget).find('canvas')[0]
                    $(this.cloneNode).find('.thumbnailBox')[0].appendChild(this.convertCanvasToImage(canvas))
                    $(this.cloneNode).find('canvas')[0].style.display = 'none'
                }
            })
            $(this.$refs['content']).delegate('.block-wrapper', 'contextmenu', (e)=> {
                return false
            })
            $(this.$refs['wrapper']).delegate('.block', 'mouseup', (e)=> {
                e.preventDefault();
                if (this.mouseFlag) {
                    this.mouseEndP = {x: e.clientX, y: e.clientY}
                    if (this.mouseEndP.x === this.mouseStartP.x && this.mouseEndP.y === this.mouseStartP.y) {
                        this.$emit('resetChangeFlag');
                        let index = parseInt($(e.currentTarget).attr('data-index'), 10)
                        if (this.activeIndex !== index) {
                            this.calcEmitP(index)
                        } else {
                            if (this.defaultSelectAll) {
                                this.activeIndex = -1
                                this.activeId = null
                                this.$emit('returnActivePositions', this.currentBeats)
                            }
                        }
                         if (e.button === 2) {
                            let height = $(this.$refs['tempPopup']).height()
                            let left = e.clientX
                            $(this.$refs['tempPopup']).css({
                                left: left + 10,
                                top:  e.clientY
                            })
                            this.isShowTempPopup = true
                        }
                        document.body.removeChild(this.cloneNode)
                        this.mouseFlag = false
                    }
                }
            })
            $(document).on('mousemove', this.documentMouseMove)
            $(document).on('mouseup', this.documentMouseUp)
        },
        // 收起模板卡片
        animateRetract() {
            if (!this.isAnimate) return
            if (this.mouseFlag) return;
//            this.isShowTempList = false
            for(let i = 0; i < $(this.$refs['block']).length; i++) {
                let dom = $(this.$refs['block'])[i], len = $(this.$refs['block']).length
                let time = 500;
                let left = -this.rangeArr[i]
                $(dom).animate({
                    marginLeft: `${left}px`,
                    height: '25px',
                    width: this.blockSize.width + 'px',
                    opacity: 0
                },time, () => {
                    $(this.$refs.content).css('height','25px')
                    this.$emit('handleAnimate', false)
                    this.isShowTempList = false
                });
            }
        },
        // 展开卡片列表
        animateOpen() {
            if (!this.isAnimate) return
//            if (!this.isOpen) {
                $(this.$refs.content).css('height',this.wrapperSize.height + 'px')
                this.isShowTempList = true
                for(let i = 0; i < $(this.$refs['block']).length; i++) {
                    let dom = $(this.$refs['block'])[i], len = $(this.$refs['block']).length
                    let time = 500;
                    $(dom).animate({
                        marginLeft: 0,
                        height: this.blockSize.height + 'px',
                        width: this.blockSize.width + 'px',
                        opacity: 1
                    },time, () => {
//                        this.isOpen = true
                    });
                }
//            }
            this.$emit('handleAnimate', true)
        },
        // 将canvas转化成图片
        convertCanvasToImage(canvas) {
            var image = new Image();
            image.src = canvas.toDataURL("image/png");
            image.style.width = this.canvasWidth +'px'
            image.style.position = 'relative'
            image.zIndex = 1000
            image.style.height = this.blockSize.height - 25 +'px'
            return image
        },
        handleChangeBeatType(item) {
            this.isShowTempPopup = false
            if (item.value !== this.currentBeatType) {
                this.$emit('handleChangeBeats', {
                    from: this.currentBeatType,
                    to: item.value,
                    positions: this.classifiedData[this.currentNode.index].positions,
                    updateMode: item.type
                })
            }
        },
        calcEmitP(index) {
            if (this.classifiedData.length > 0) {
                this.activeIndex = index
                this.activeTemp = this.classifiedData[index]
                this.activeId = this.classifiedData[index].clusterId
                this.$emit('returnActivePositions', this.classifiedData[index].positions?this.classifiedData[index].positions:[])
            } else {
                this.$emit('returnActivePositions', [])
            }
            this.$emit('handleHidePopup')
        },
//        moveTemp(from, to) {
//            this.changeViewLoadingState(true)
//            console.log(this.classifiedData)
//            console.log(from, to)
//            API.moveTemp(this.report_id, this.classifiedData[from].clusterId, this.classifiedData[to].clusterId, {positions: this.classifiedData[from].positions}).then((data) => {
//                this.binarySearch(this.classifiedData[from].positions, this.currentBeatType, this.classifiedData[to].clusterId)
//                this.classifiedData[to].positions = this.classifiedData[to].positions.concat(this.classifiedData[from].positions)
//                this.classifiedData[to].len = this.classifiedData[to].len + this.classifiedData[from].len
//                if (!this.classifiedData[to].updated) {
//                    this.classifiedData[to].updated = true
//                }
//                this.getDivsRange()
//                let toId = this.classifiedData[to].clusterId
//                this.activeId = toId
//                this.classifiedData.splice(from, 1)
////                this.calcEmitP(index === -1? 0: index)
////                this.changeActiveIndex(index === -1? 0: index)
//                this.moveToIndex = -1
//                this.$emit('handleChangePageState', {key:'dragCover', type: this.currentBeatType})
//            })
//        },
        moveTemp(from, to) {
            this.changeViewLoadingState(true)
            API.moveTemp(this.report_id, this.currentBeatType, this.classifiedData[from].clusterId, this.classifiedData[to].clusterId, {positions: this.classifiedData[from].positions.map(v => v.p)}).then((data) => {
                let toId = this.classifiedData[to].clusterId
                this.activeId = toId
                this.moveToIndex = -1
                this.$emit('handleChangePageState', {key:'dragCover', type: this.currentBeatType})
            })
        },
        loadTempList() {
            this.activeIndex = -1
            this.changeViewLoadingState(true)
            API.getTempList(this.report_id, {
                beatType: this.currentBeatType,
                date: Util.formatDate.format(new Date(this.currentDate), 'yyyy/MM/dd')
            }).then((data) => {
                this.classifiedData = []
                let currentTypeBeats = this.currentBeats
                data.push({clusterId: -1,updated: true,wave: []})
                data.forEach((v, i) => {
                    let temp = this.getTempPositions(v, currentTypeBeats)
                    if (temp) {
                        this.classifiedData.push(temp)
                    }
                })
                if (this.classifiedData.length > 0) {
                    this.getDivsRange();
                    this.classifiedData.forEach((obj, index) => {
                        if (obj.clusterId === -1) {
                            this.drawThumbnail(obj.clusterId, obj.positions[0].p, index)
                        } else {
                            this.drawThumbnail(obj.clusterId, obj.wave, index)
                        }
                    })
                    this.getCurrentEmitPosition(currentTypeBeats)
                } else {
                    this.$emit('returnActivePositions', [])
                }
            })
        },
        getCurrentEmitPosition(currentTypeBeats) {
            if (this.isResetActive === 1) { // 当是选择日期或者选择心拍类型时
                this.activeTemp = this.classifiedData[0]
                this.activeId = null
                if (this.defaultSelectAll) {
                    this.$emit('returnActivePositions', currentTypeBeats)
                } else {
                    this.calcEmitP(0)
                }
            } else { // 当是修改心拍或者是合并模板时
                let index = this.classifiedData.findIndex((v) => {
                    return this.activeId === v.clusterId
                })
                if (index === -1) {
                    this.activeTemp = this.classifiedData[0]
                    if (this.defaultSelectAll && this.activeId === null) {
                        this.$emit('returnActivePositions', currentTypeBeats)
                    } else {
                        index = 0
                        this.direction === 'horizontal' ? $(this.$refs.wrapper).scrollLeft(0) : $(this.$refs.wrapper).scrollTop(0)
                        this.calcEmitP(index)
                    }
                } else {
                    this.calcEmitP(index)
                }
            }
        },
        // 画缩略图
        drawEcgPart(context, data2, width, x_pos = 0, x_end_pos = this.canvasWidth, y_start_pos = 0, frequency = data2.length, add = 10, y_height = this.canvasHeight) {
            let data = new Array(this.canvasWidth);
            Util.linearInterpolate(data2, data);
            frequency = this.canvasWidth;
            context.clearRect(0, 0, x_end_pos - x_pos, y_height - y_start_pos);
            context.lineWidth = 1;
            context.beginPath();
            let length = data.length;
            context.lineCap="round";
            context.strokeStyle = '#030304';
            context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
            for (let i = 0; i < length; i++) {
                let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                let yPosition = -data[i] * add * 5 + y_height / 2;
                context.lineTo(xPosition, yPosition);
            }
            context.stroke();
            return;
        },
        // 得到每个模板的缩略图数据
        drawThumbnail(id, wave, index) {
            this.$nextTick(() => {
                let ctx = this.$refs['thumbnail'+ index][0].getContext("2d");
                if (id !== -1) {
                    this.drawEcgPart(ctx, wave, $(this.$refs['thumbnail'+ index][0]).width())
                } else {
                    if (!this.wholeViewLoading) {
                        this.loading = true
                    }
                    BLOCK_API.getBlockData({
                        limit: 1,
                        positions: wave,
                        report_id: this.report_id,
                        start: 0
                    }).then(data => {
                        this.loading = false
                        let start = parseInt((data[0].voltages.length - FREQUENCY)/2, 10)
                        let thumbnailData = data[0].voltages.slice(start, start + FREQUENCY)
                        this.drawEcgPart(ctx, thumbnailData, $(this.$refs['thumbnail'+ index][0]).width())
                    })
                }
            })
        },
        // 根据后端请求得到模板id顺序 将本地数据分组得到模板列表
        getTempPositions(obj, tags) {
            let positions = []
            tags.forEach((v1, i1) => {
                let item = v1
                if (item.m === obj.clusterId) {
                    positions.push(item)
                }
            })
            positions = positions.sort((a, b) => a.p - b.p)
            if (positions.length > 0) {
                return {
                    updated: obj.updated,
                    clusterId: obj.clusterId,
                    len: positions.length,
                    wave: obj.wave,
                    type: this.currentBeatType,
                    positions: positions
                }
            }
        },
        // 得到每个div的高度范围，用于之后拖拽判断和哪个div相交
        getDivsRange () {
            if (this.direction === 'vertical') {
                this.rangeArr = this.classifiedData.map((v, i) => {
                    return i * this.blockSize.height.toFixed(2)
                })
                this.rangeArr.push(this.classifiedData.length * this.blockSize.height + this.blockSize.height / 2)
            } else {
                this.rangeArr = this.classifiedData.map((v, i) => {
                    return i * this.blockSize.width.toFixed(2)
                })
                this.rangeArr.push(this.classifiedData.length * this.blockSize.width + this.blockSize.width / 2)
            }
        },
        isInAreaVertical(x) {
            if (this.wrapper.x - this.wrapperSize.width <= x && x <= this.wrapper.x + this.wrapperSize.width) {
                return true
            } else {
                return false
            }
        },
        isInAreaHorizontal(y) {
            if (this.wrapper.y - this.wrapperSize.height <= y && y <= this.wrapper.y + this.wrapperSize.height) {
                return true
            } else {
                return false
            }
        },
        getIndexFromAreaVertical(y) {
            if (this.rangeArr.length <= 1) return null
            let index = null
            if (this.wrapper.y <= y && y < this.wrapper.y + this.wrapperSize.height) {
                let yScroll = y - this.wrapper.y + $(this.$refs.wrapper).scrollTop()
                for (let i = 0; i < this.rangeArr.length; i++) {
                    if (this.rangeArr[i] <= yScroll && yScroll < this.rangeArr[i + 1] && i !== this.currentNode.index) {
                        index = i
                        break
                    }
                }
            } else if (y + this.wrapperSize.height / this.visibleNumber > this.wrapper.y && this.currentNode.index !== 0) {
                index = 0
            }
            return index
        },
        getIndexFromAreaHorizontal(x) {
            if (this.rangeArr.length <= 1) return null
            let index = null
            if (this.wrapper.x <= x && x < this.wrapper.x + this.wrapperSize.width) {
                let xScroll = x - this.wrapper.x + $(this.$refs.wrapper).scrollLeft()
                for (let i = 0; i < this.rangeArr.length; i++) {
                    if (this.rangeArr[i] <= xScroll && xScroll < this.rangeArr[i + 1] && i !== this.currentNode.index) {
                        index = i
                        break
                    }
                }
            } else if (x + this.blockSize.width > this.wrapper.x && this.currentNode.index !== 0) {
                index = 0
            }
            return index
        }
    }
}
</script>
<style type="text/css" scoped lang="scss">
  .block-wrapper {
    height: 100%;
    width: 100%;
    white-space: nowrap;
    position: relative;
    z-index: 1000;
    border: 1px solid #dedede;
    box-sizing: content-box;
    border-radius: 5px;
    -moz-user-select:none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }
  .tempPopup {
    position: fixed;
    top:0;
    background: #ffffff;
    list-style: none;
    z-index: 10000;
    box-shadow: 3px 3px rgba(123, 123, 123, 0.43);
    width: 175px;
    border: 1px solid #C0C4CC;
    left: 0;
    li {
      text-align: center;
      line-height: 30px;
      cursor: pointer;
      font-size: 14px;
    }
    &>li:last-child {
        border-bottom: none;
    }
  }
  .block {
    cursor: pointer;
    padding: 10px 10px;
    margin:0 auto;
    animation-fill-mode: forwards;
    box-sizing: border-box;
  }
  .block-item-head {
    display: flex;
    position: relative;
    line-height: 25px;
    padding: 0px 10px;
    box-sizing: border-box;
    white-space: nowrap;
    color: #ffffff;
    background: #3b96c5;
  }
  .icon {
    height: 30px;
    width: 30px;
    position: absolute;
    line-height: 30px;
    font-size: 25px;
    text-align: center;
    border: 2px solid #3b96c5;
    color: #3b96c5;
    border-radius: 50%;
    right: 20px;
  }
  .cut-icon {
    top:10px;
  }
  .add-icon {
    bottom:10px;
  }
  .thumbnail {
      margin: auto;
  }
  .block-item-content {
    box-sizing: border-box;
    position: relative;
    background: #ffffff;
    width: 100%;
  }
  .block-item {
    overflow: hidden;
    border: 1px solid #c5c5c5;
    display: flex;
    position: relative;
    z-index: 100;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    flex-direction: column;
  }
  .flex1 {flex: 1;text-align: center}
  .cloneBlock {
    z-index: 1000;
    position: fixed;
    opacity: 0 !important;
  }
  /*.content {*/
      /*height: 100%;*/
      /*width: 100%;*/
  /*}*/
  .moveActive {
      border-color: rgba(239, 132, 25, 0.55) !important;
      .block-item-head {
          background: rgba(239, 132, 25, 0.55) !important;
      }
      .icon {
          border-color: rgba(239, 132, 25, 0.55) !important;
          color: rgba(239, 132, 25, 0.55) !important;
      }
  }
  .blockActive {
     border-color: #ff8000;
    .block-item-head {
      background: #ff8000;
    }
    .icon {
      border-color: #ff8000;
      color: #ff8000;
    }
  }
</style>
