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
      reportPanelTmpl = template.compile(reportPanel.html());

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
    Ajax url setting
  */
  var actMsg = 'data/event.json', basicData, skuData;

  /*
    sku 分页数据处理
      data:    传入记录数
      page:    当前页 No.,默认0(第一页)
      pages:   共有页数
      records: 每页记录数，默认10条
  */
  var skuPage = function(data, page, records){
    var page = page - 1 || 0,
        records = records || 2,
        count = data.length,
        option = {
          page:  page,
          totle: count,
          pages: Math.ceil(count / records)
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
    活动信息ajax
  */
  $.get(actMsg, {type: 'GetActMsg', actid: 1})
    .done(function(d){
      /*
        获取活动信息 API 数据进行页面渲染
        1. 活动基本信息
        2. sku list
        3. 活动预测
        4. 活动报告
      */
      basicData = d.data, skuData = d.act_sku;
      // 1
      pageRender(basicData, basicPanelTmpl);
      // 2
      pageRender(skuPage(skuData), skuTableTmpl, $('.panel:first>.panel-body'));
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
        3. 基本指标
        4. 对比活动
      */
      // 1
      var defaultSuggest = {
        store: function(){
          var data = d.act_store;
          return {
            data: data,
            displayField: 'objtext',
            valueField: 'objid',
            value: data.filter(function(item){
              return item.objid === 'NULL';
            })
          };
        },

        compare: function(){
          return {
            data: d.act_compare,
            displayField: 'act_name',
            valueField: 'act_id',
          };
        },

        catalog: function(){
          var data = d.act_catalog,
              defaultCatalog = ['目标客户购买人数','天机转化率','目标客户购买所有产品金额','目标客户购买目标产品金额','目标客户所有产品客单件','目标客户所有产品客单价'];
          return {
            data: data,
            displayField: 'catalog',
            valueField: 'catid',
            maxSelection: 6,
            maxSelectionRenderer: function(v){return '最多显示' + 6+ '项';},
            value: data.filter(function(item){
              return defaultCatalog.indexOf(item.catalog) > -1;
            })
          };
        }
      }

      // 2
      var actStore = suggest('#storeFront', defaultSuggest.store());
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
      var actCatalog = suggest('#baseCatalog', defaultSuggest.catalog())

      // 4
      var actCompare = suggest('#compareEvent', defaultSuggest.compare());
    })
    .done(function(d){
      console.log(d.data.act_id);
    });

  /*
    event area
  */

  var clickEvent = {
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
    }
  }

  $(document).on('click', '[data-click]', function(e){
    var self = $(this), evt = self.data('click');
    clickEvent[evt] && clickEvent[evt](e, self);
  });

  // $('#indexTable').on('click', 'thead input', function(e){
  //   var i = $(this).attr('id').split('-')[1] - 0 + 1;
  //   $('#indexTable td:nth-child(' + i + ')').toggleClass('active');
  // })
})();
