(function(){
  'use strict';

  /*
    render template setting
  */
  var basicPanel      = $('#basicPanel'),
      basicPanelTmpl  = template.compile(basicPanel.html()),
      skuTable        = $('#skuTable'),
      skuTableTmpl    = template.compile(skuTable.html()),
      infoBlock       = $('#infoBlock'),
      infoBlockTmpl   = template.compile(infoBlock.html()),
      reportPanel     = $('#reportPanel'),
      reportPanelTmpl = template.compile(reportPanel.html()),

      basicReport     = $('#basicReport'),
      basicReportTmpl = template.compile(basicReport.html());

  var removeItems = [basicPanel, skuTable, infoBlock, reportPanel];
  for(var i=0, x=removeItems.length; i<x; i++) {removeItems[i].remove();}

  /*
    suggest default options
  */
  var suggestOptions = {
    allowFreeEntries: false,
    maxEntryLength: null,
    maxSelection: 10,
    toggleOnClick: true,
    useTabKey: true,
    useCommaKey: true,
    useZebraStyle: true,
    selectFirst: true,
    disabledField: 'disabled',
    placeholder: '点击选取或输入关键词',
    noSuggestionText: '<i class="text-warning fa fa-exclamation-triangle"></i> 输入有误'
  };

  /*
    获取 url 上指定参数
  */
  var request = function(param){
    var reg = new RegExp("(^|&)"+ param +"=([^&]*)(&|$)");
    var r = location.search.substr(1).match(reg);
    return (r !== null) ? decodeURIComponent(r[2]) : null;
  };

  /*
    actid:     本次活动 id，默认从 url 中获取
    actMsgUrl: 活动信息数据请求地址
    actRptUrl: 活动报告数据请求地址
    rptParams: 活动报告数据请求参数
    actMsgData: 活动基本数据
    actRptData: 活动报告数据
  */
  var actid = request('actid') || 1,
      actMsgUrl = 'data/event.json',
      actMsgParam = {type: 'GetActMsg', actid: actid || 1},
      actRptUrl = 'data/report.json',
      rptParams = {},
      actMsgData, actRptData;

  /*
    Suggest 对象设置：
    1. actStore     选择店铺
    2. actCatalog   选择基本指标
    3. actCompare   添加对比活动
  */
  var actStore, actCatalog, actCompare;

  /* ----------------- split ----------------- */

  /*
    sku 分页处理， 供 pageRender 方法使用
      data:    传入原始记录数
      page:    当前页 No.,默认0(第一页)
      pages:   共有页数
      records: 每页记录数，默认10条
  */
  var skuPage = function(data, page, records){
    var page = page - 1 || 0,
        records = arguments[2] || 5,
        count = data.length,
        option = {
          page:  page,
          totle: count,
          pages: Math.ceil(count / records),
          records: records
        },
        _arr = [], f, m;

    for(var i = 0; i < count; i++) {
      f = Math.floor(i / records), m = i % records;
      m === 0 && _arr.push([]);
      _arr[f][m] = data[i];
    }
    return $.extend(option, {data: _arr[page], datas: _arr});
  };

  /*
    render method 供 ajax 获取 data 后使用
      arguments[0]: 组件 render 数据
      arguments[1]: 组件 render 模板
      arguments[2]: 指定加载该组件的容器，如无指定，则 append 到 .container 中
  */
  var pageRender = function(){
    var data = arguments[0],
        tmpl = arguments[1],
        container = arguments[2];
    container ? container.html(tmpl(data))
              : $(tmpl(data)).appendTo('.container');
  };

  /*
    magicSuggest method 供 Ajax 获取数据后渲染活动报告选项用
      arguments[0]: suggest 容器的选择符
      arguments[1]: 各 suggest 自定义 options
  */
  var suggest = function(){
    var $ele = $(arguments[0]),
        opts = arguments[1];

    var sgst = $ele.magicSuggest($.extend({}, suggestOptions, opts));
    return $(sgst);
  };

  /*
    活动基本指标趋势图基本设置
  */
  var setBaseChart = function(container, title, category, data){
    var option = {
      title: {
        text: title
      },
      tooltip: {
        trigger: 'axis'
      },
      toolbox: {
        show: true,
        feature: {
          mark: {show: true},
          magicType: {show: true, type: ['line', 'bar']},
          restore: {show: true},
          saveAsImage: {show: true}
        }
      },
      calculable : true,
      xAxis : [{
        type: 'category',
        boundaryGap : false,
        data: category
      }],
      yAxis: [{
        type: 'value'
      }],
      series: [{
        name: '人数',
        type: 'line',
        smooth: true,
        itemStyle: {normal: {areaStyle: {type: 'default'}}},
        data: data
      }]
    };
    echarts.init(container, 'macarons').setOption(option);
  };

  /* ----------------- split ----------------- */

  /*
    活动信息ajax
  */
  $.get(actMsgUrl, actMsgParam)
    .done(function(data){
      actMsgData = data;
    })
    .done(function(d){
      /*
        获取活动信息 API 数据进行页面渲染
        1. 活动基本信息
        2. sku list
        3. 活动预测
        4. 活动报告
      */
      var basicData = actMsgData.data, skuData = actMsgData.act_sku;
      // 1
      pageRender(basicData, basicPanelTmpl);
      // 2
      pageRender(skuPage(actMsgData.act_sku), skuTableTmpl, $('.panel:first>.panel-body'));
      // 3
      pageRender(basicData, infoBlockTmpl);
      // 4
      pageRender({}, reportPanelTmpl);
    })
    .done(function(d){
      /*
        活动报告可选项设置
        1. suggest 默认值选择
          - store: 店铺选择
          - compare: 活动对比
          - catalog: 基本指标
        2. 活动店铺
          - 选择全部，则 disable 其他选项，反之亦然
        3. 基本指标
        4. 对比活动
        5. 页面渲染完成后立即生成活动基本指标
      */
      // 1
      var defaultSuggest = {
        // 店铺选择
        store: function(){
          var data = actMsgData.act_store;
          return {
            data: data,
            displayField: 'objtext',
            valueField: 'objid',
            value: data.filter(function(item){
              return item.objid === 'NULL';
            })
          };
        },
        // 活动对比
        compare: function(){
          return {
            data: actMsgData.act_compare,
            displayField: 'act_name',
            valueField: 'act_id'
          };
        },
        // 基本指标
        catalog: function(){
          var data = actMsgData.act_baseindex;
          return {
            data: data,
            displayField: 'objtext',
            valueField: 'objid',
            maxSelection: 6,
            maxSelectionRenderer: function(v){return '最多选取 ' + 6 + ' 项';},
            value: data.filter(function(item){
              return item.default === 1;
            })
          };
        }
      }

      // 2
      actStore = suggest('#storeFront', defaultSuggest.store());
      actStore.on('selectionchange expand', function(){
        var value= this.getValue(),
            data = this.getData();

        if(value.length > 0) {
          value.indexOf('NULL') !== -1
          // 选择全部门店
          ? this.setData(data.map(function(item){
            item.objid !== 'NULL' ? item.disabled = true
            : item.disabled = false;
            return item;
          }))
          // 门店多选
          : this.setData(data.map(function(item){
            item.objid !== 'NULL' ? item.disabled = false
            : item.disabled = true;
            return item;
          }));
        } else {
          this.setData(data.map(function(item){
            delete item.disabled;
            return item;
          }));
        }
      });

      // 3
      actCatalog = suggest('#baseCatalog', defaultSuggest.catalog())
      actCatalog.on('blur', function(){
        this.getSelection().length !== 6 && alert('必须选出6项指标！')
      });

      // 4
      actCompare = suggest('#compareEvent', defaultSuggest.compare());

      // 5
      $('[data-click=gotReport]').trigger('click');
    });

  /* ----------------- split ----------------- */

  /*
    click event area
    1. sku list pagination action
    2. 活动基本指标
    3. 活动基本指标时间趋势图
  */
  var clickEvent = {
    // 1. sku list pagination action
    turnPage: function(e, self){
      e.preventDefault();
      var href = self.attr('href'),
          pages = skuPage(skuData).pages, page;

      if(href === '+1' || href === '-1') {
        page = parseInt(self.closest('ul').find('.active > a').attr('href'), 10) + parseInt(href);
      } else {
        page = parseInt(href);
      }
      page = Math.max(1, Math.min(page, pages));
      !isNaN(page)
        && pageRender(
          skuPage(skuData, page),
          skuTableTmpl, $('.panel:first>.panel-body'));
    },

    /*
      2. 活动基本指标
        a. 组装参数
        b. 获取接口数据
        c. 渲染基本报告数据表格
    */
    gotReport: function(e, obj){
      e.preventDefault();
      var spin = obj.children('i');
      spin.addClass('fa-spin');

      var storeid = actStore[0].getValue(),
          compareid = actCompare[0].getValue(),
          comparetag = actCatalog[0].getValue();
      if (comparetag.length !== 6) {
        actCatalog.trigger('blur');
        return false;
      }
      // a
      $.extend(rptParams, {
        actid: actid,
        storeid: storeid,
        comparetag: comparetag
      });
      comparetag.length > 0
        && $.extend(rptParams, {compareid: compareid});
      // b
      $.get(actRptUrl, rptParams)
        .done(function(data){
          actRptData = data;
          // c
          spin.removeClass('fa-spin');
          pageRender({
            catalog: actCatalog[0].getSelection(),
            compare: actRptData['msg_compare'],
            activity: [].concat.apply([],[
              actMsgData.data.act_name, actCompare[0].getSelection().map(function(item){
                return item.act_name;
              }),
              '活动总计'])
          }, basicReportTmpl, $('#spIndex'));
        });
    },
    /*
      3.活动基本指标时间趋势图
        a. 有指标 checked 时显示趋势图 panel
        b. 有指标选中时，创建该 charts 容器，否则就 remove 掉
    */
    timeAreaChart: function(e, self){
      var baseChartPanel = $('#spBaseChart'),
          index = self.data('index'),
          chartContainer = $('#baseChart' + index)[0],
          dataset = actRptData['msg_timetrend'][index];
      // a
      self.closest('tr').find(':checked').length > 0 ? baseChartPanel.removeClass('hide') : baseChartPanel.addClass('hide');
      // b
      if(!!!chartContainer && self.is(':checked')) {
        $('#spBaseChart > .panel-body').append($('<div class="col-xs-6" id="baseChart' + index + '" style="height:300px;"></div>'));
        setBaseChart(
          $('#baseChart' + index)[0],
          self.data('catalog'),
          dataset['dailydate'],
          dataset['dailydata']
        )
      } else if(!!chartContainer && !self.is(':checked')) {
        chartContainer.remove();
      } else {
        return;
      }

    }
  }

  $(document).on('click', '[data-click]', function(e){
    var self = $(this), evt = self.data('click');
    clickEvent[evt] && clickEvent[evt](e, self);
  });

  // 翻页 onchange 事件
  $(document).on('change', '#pageSetting', function(){
    var records = $(this).val() - 0;
    pageRender(
        skuPage(skuData, 1, records),
        skuTableTmpl, $('.panel:first>.panel-body'));
  });

  // $('#indexTable').on('click', 'thead input', function(e){
  //   var i = $(this).attr('id').split('-')[1] - 0 + 1;
  //   $('#indexTable td:nth-child(' + i + ')').toggleClass('active');
  // })
})();
