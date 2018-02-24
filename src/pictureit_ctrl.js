import _ from 'lodash';
import { MetricsPanelCtrl } from 'app/plugins/sdk';
import './sprintf.js';
import './angular-sprintf.js';
import kbn from 'app/core/utils/kbn';

import { Emitter } from 'app/core/core';

const panelDefaults = {
    valueMaps: [],
    seriesList: [],
    series: [],
    bgimage: '',
    sensors: [],
    height: '400px',
    width: '100px'
};

export class PictureItCtrl extends MetricsPanelCtrl {

    constructor($scope, $injector) {
        super($scope, $injector);
        _.defaults(this.panel, panelDefaults);
        var bindThis = this;
        this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
        this.events.on('panel-initialized', this.render.bind(this));
        this.events.on('data-received', this.onDataReceived.bind(this));
        this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
        this.hiddenImg = new Image();
        this.hiddenImg.addEventListener("load", function () {
            bindThis.refImageSize = { w: this.naturalWidth, h: this.naturalHeight }
        });
        this.hiddenImg.src = this.panel.bgimage;
    }

    onDataReceived(dataList) {
        var dataListLength = dataList.length;
        this.panel.valueMaps = [];
        for (var series = 0; series < dataListLength; series++) {
            this.panel.valueMaps.push({
                name: dataList[series].target,
                value: dataList[series].datapoints[dataList[series].datapoints.length - 1][0]
            });
        }

        this.render();
    }

    deleteSensor(index) {
        this.panel.sensors.splice(index, 1);
    }

    addSensor() {
        if (this.panel.sensors.length == 0)
            this.panel.sensors.push({
                name: 'A-series',
                xlocation: 200,
                ylocation: 200,
                format: 'none',
                decimals: 'auto',
                bgcolor: 'rgba(0, 0, 0, 0.58)',
                color: '#FFFFFF',
                size: 22,
                currentSize: 22,
                bordercolor: 'rgb(251, 4, 4)',
                visible: true
            });
        else {
            var lastSensor = this.panel.sensors[this.panel.sensors.length - 1];

            this.panel.sensors.push({
                name: lastSensor.name,
                xlocation: 200,
                ylocation: 200,
                format: lastSensor.format,
                decimals: lastSensor.decimals,
                bgcolor: lastSensor.bgcolor,
                color: lastSensor.color,
                size: lastSensor.size,
                currentSize: lastSensor.size,
                bordercolor: lastSensor.bordercolor,
                visible: true
            });
        }
    }

    setUnitFormat(subItem, index) {
        this.panel.sensors[index].format = subItem.value;
    }

    onInitEditMode() {
        this.addEditorTab('Options', 'public/plugins/bessler-pictureit-panel/editor.html', 2);
        var bindThis = this;
        this.editModeInterval = true;
        this.refresher = setInterval(function () {
            bindThis.events.emit('panel-initialized');
        }, 1000);
    }

    link(scope, elem, attrs, ctrl) {
        var sensors;
        var valueMaps;

        const $panelContainer = elem.find('.panel-container');

        function pixelStrToNum(str) {
            return parseInt(str.substr(0, str.length - 2));
        }

        function render() {
            if (!ctrl.panel.sensors) {
                return;
            }
            if (ctrl.editMode && !ctrl.editModeInterval) {
                ctrl.editModeInterval = true;
                ctrl.refresher = setInterval(function () {
                    ctrl.events.emit('panel-initialized');
                }, 1000);
            } else if (!ctrl.editMode) {
                ctrl.editModeInterval = false;
                clearInterval(ctrl.refresher);
            }
            var refImage = document.getElementById('imageRef');
            if (!refImage) {
                return;
            }
            if (refImage.clientHeight > refImage.clientWidth) {
                refImage.style = "width: auto; visibility: hidden; position: absolute";
            }
            refImage.style='width:100%';
            console.log(refImage.clientHeight);
            ctrl.panel.height = refImage.clientHeight;
            var width = pixelStrToNum($panelContainer.css("width"));
            var height = pixelStrToNum($panelContainer.css("height"));

            sensors = ctrl.panel.sensors;
            valueMaps = ctrl.panel.valueMaps;
            var sensorsLength = sensors.length;
            var valueMapsLength = valueMaps.length;
            var imageHeight = refImage.clientHeight;
            var imageWidth = refImage.clientWidth;
            var originalHeight = ctrl.refImageSize.h;
            var originalWidth = ctrl.refImageSize.w;
            for (var sensor = 0; sensor < sensorsLength; sensor++) {
                sensors[sensor].visible = sensors[sensor].xlocation < width && sensors[sensor].ylocation < height;
                var calculatedYPos = imageHeight * sensors[sensor].ylocation / originalHeight;
                var calculatedXPos = imageWidth * sensors[sensor].xlocation / originalWidth;
                sensors[sensor].ylocationStr = (calculatedYPos).toString() + "px";
                sensors[sensor].xlocationStr = (calculatedXPos).toString() + "px";
                sensors[sensor].lastSize = imageWidth * sensors[sensor].size / originalWidth;
                sensors[sensor].sizeStr = imageWidth * sensors[sensor].size / originalWidth + "px";
                for (var valueMap = 0; valueMap < valueMapsLength; valueMap++) {
                    if (sensors[sensor].name == valueMaps[valueMap].name) {
                        sensors[sensor].valueFormatted = kbn.valueFormats[sensors[sensor].format](valueMaps[valueMap].value, sensors[sensor].decimals, null);
                        break;
                    }
                }
            }

        }

        this.events.on('render', function () {
            render();
            ctrl.renderingCompleted();
        });
    }
}

PictureItCtrl.templateUrl = 'module.html';
