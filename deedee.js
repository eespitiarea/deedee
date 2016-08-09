/* 
 * The MIT License
 *
 * Copyright 2016 Emmanuel Espitia Rea <eespitia.rea@gmail.com>.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var deedee = {};
(function (window, document) {
    /* global pdfMake */
    deedee.defaults = {
        header: {
            bold: true,
            color: 'whitesmoke',
            size: 16,
            background: '#0275D8'
        },
        text: {
            bold: false,
            color: 'rgb(7,7,7)',
            size: 10,
            background: 'rgb(248,248,248)'
        }
    };
    deedee.document = function () {
        var self = {},
                header = {
                    text: null,
                    bold: true,
                    color: deedee.defaults.header.color,
                    size: deedee.defaults.header.size,
                    background: deedee.defaults.header.background
                },
        body = [];
        self.render = function () {
            return {
                header: {
                    table: {
                        widths: ['1%', '*', '1%'],
                        body: [
                            [
                                '',
                                {
                                    text: header.text || '',
                                    alignment: 'center',
                                    bold: header.bold,
                                    color: header.color,
                                    fillColor: header.background,
                                    fontSize: header.size
                                },
                                ''
                            ]
                        ]
                    },
                    layout: 'noBorders'
                },
                footer: function (currentPage, pageCount) {
                    return {
                        table: {
                            widths: ['1%', '*', '*', '1%'],
                            body: [
                                [
                                    '',
                                    {
                                        text: 'Fecha de impresión: ' + (new Date()).toLocaleString(),
                                        fillColor: 'lightgray',
                                        fontSize: '10'
                                    },
                                    {
                                        text: 'Página ' + currentPage + ' de ' + pageCount,
                                        alignment: 'right',
                                        fillColor: 'lightgray',
                                        fontSize: '10'
                                    },
                                    ''
                                ]
                            ]
                        },
                        layout: 'noBorders'
                    };
                },
                content: body
            };
        };
        self.setTitle = function (title) {
            header.text = title;
            return self;
        };
        self.getTitle = function () {
            return header.text;
        };
        self.setCustomTitle = function (options) {
            for (var name in options) {
                if (options.hasOwnProperty(name) && header.hasOwnProperty(name)) {
                    header[name] = options[name];
                }
            }
            return self;
        };
        self.append = function (node) {
            body.push('\n', node);
            return self;
        };
        self.appendImage = function (options) {
            return self.append({
                image: options.image,
                width: options.width || 128
            });
        };
        self.appendTable = function (options) {
            var widths = [], tableHeaders = [], tableBody = [], header, i = 0;
            for (header in options.headers) {
                widths.push('*');
                tableHeaders.push({
                    text: header,
                    color: options.color || deedee.defaults.header.color,
                    fillColor: deedee.defaults.header.background,
                    bold: options.bold || true,
                    fontSize: options.size || 11,
                    alignment: options.alignment || 'center'
                });
            }
            tableBody.push(tableHeaders);
            for (; i < options.data.length; i++) {
                tableBody.push(options.data[i]);
            }
            return self.append({
                table: {
                    widths: widths,
                    headerRows: 1,
                    body: tableBody
                }
            });
        };
        self.appendSubtitle = function (options) {
            return self.append({
                text: options.text,
                bold: options.bold || false,
                italic: options.italic || false,
                fontSize: options.size || 14,
                alignment: options.alignment || 'center'
            });
        };
        self.appendParagraph = function (options) {
            return self.append({
                text: options.text,
                bold: options.bold || false,
                fontSize: options.size || 10,
                alignment: options.alignment || 'left'
            });
        };
        self.appendList = function (options) {
            var list = {fontSize: options.size || 10}, innerList = [], i = 0;
            for (; i < options.items.length; i++) {
                if (typeof options.items[i] === 'string') {
                    innerList.push(options.items[i]);
                } else {
                    innerList.push({
                        text: options.items[i].text,
                        bold: options.items[i].bold || false,
                        fontSize: options.items[i].size || 10
                    });
                }
            }
            list[options.enumerated ? 'ol' : 'ul'] = innerList;
            return self.append(list);
        };
        self.open = function (documentDefinition) {
            pdfMake.createPdf(documentDefinition || self.render()).open();
            return self;
        };
        self.print = function (documentDefinition) {
            pdfMake.createPdf(documentDefinition || self.render()).print();
            return self;
        };
        return self;
    };
    deedee.parser = function () {
        var self = {};
        self.parseHtml = function (container) {
            var root = document.querySelector(container),
                    title = root.querySelector('[data-dd="title"]'),
                    nodes = root.querySelectorAll('[data-dd]'),
                    ddd = deedee.document(),
                    i = 0, style = null;
            ddd.setTitle(title ? title.textContent : '');
            for (; i < nodes.length; i++) {
                style = nodes[i].getAttribute('data-dd');
                if (style.indexOf('subtitle') === 0) {
                    ddd.appendSubtitle(self.parseNode(nodes[i]));
                }
                if (style.indexOf('paragraph') === 0) {
                    ddd.appendParagraph(self.parseNode(nodes[i]));
                }
                if (style.indexOf('list') === 0) {
                    ddd.appendList(self.parseList(nodes[i]));
                }
            }
            return ddd.render();
        };
        self.parseNode = function (node) {
            var result = {text: node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' ? node.value : node.textContent}, style = node.getAttribute('data-dd'), size = null;
            if (style && (style.split(':')).length > 1) {
                if (style.indexOf('bold') >= 0) {
                    result.bold = true;
                }
                if (style.indexOf('italic') >= 0) {
                    result.italic = true;
                }
                if (style.indexOf('center') >= 0) {
                    result.alignment = 'center';
                }
                if (style.indexOf('right') >= 0) {
                    result.alignment = 'right';
                }
                if ((size = style.match(/\d+/)[0])) {
                    result.size = window.parseInt(size);
                }
            }
            return result;
        };
        self.parseList = function (list) {
            var items = [], enumerated = list.tagName === 'OL', listItems = list.querySelectorAll('li'), i = 0;
            for (; i < listItems.length; i++) {
                items.push(self.parseNode(listItems[i]));
            }
            return {enumerated: enumerated, items: items};
        };
        self.print = function (container, data) {
            var root = document.querySelector(container), html = root.innerHTML, property = null;
            for (property in data) {
                if (data.hasOwnProperty(property)) {
                    html = html.replace('{' + property + '}', data[property]);
                }
            }
            root.innerHTML = html;
        };
        return self;
    };
})(window, document);