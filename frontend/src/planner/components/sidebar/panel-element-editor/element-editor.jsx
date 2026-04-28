import React, {Component} from 'react';
import PropTypes from 'prop-types';
import PlannerContext from '../../../context/PlannerContext';
import {Map, fromJS} from 'immutable';
import AttributesEditor from './attributes-editor/attributes-editor';
import { GeometryUtils, MathUtils } from '../../../utils/export';
import convert from 'convert-units';
import { computeInsetPolygon, polygonAreaShoelace, formatAreaM2 } from '../../../catalog/factories/area-utils';
import { getWallEdgeMetrics } from '../../../catalog/factories/wall-utils';

const PRECISION = 2;
const GEOMETRY_PRECISION = 6;

export default class ElementEditor extends Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      attributesFormData: this.initAttrData(this.props.element, this.props.layer, this.props.state),
      propertiesFormData: this.initPropData(this.props.element, this.props.layer, this.props.state)
    };

    this.updateAttribute = this.updateAttribute.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Handle null attributesFormData (happens when hole has invalid line reference)
    const currentAttrHash = this.state.attributesFormData ? this.state.attributesFormData.hashCode() : null;
    const nextAttrHash = nextState.attributesFormData ? nextState.attributesFormData.hashCode() : null;
    
    if(
      currentAttrHash !== nextAttrHash ||
      this.state.propertiesFormData.hashCode() !== nextState.propertiesFormData.hashCode() ||
      this.props.state.clipboardProperties.hashCode() !== nextProps.state.clipboardProperties.hashCode()
    ) return true;

    return false;
  }

  componentDidUpdate(prevProps) {
    let { element, layer, state } = this.props;
    let { prototype, id } = element;
    let scene = prevProps.state.get('scene');
    let selectedLayer = scene.getIn(['layers', scene.get('selectedLayer')]);

    if( selectedLayer.hashCode() !== layer.hashCode() ) this.setState({
      attributesFormData: this.initAttrData(element, layer, state),
      propertiesFormData: this.initPropData(element, layer, state)
    });
  }

  buildLengthMeasure(length, displayUnit) {
    const convertedLength = convert(length).from(this.context.catalog.unit).to(displayUnit);
    return new Map({
      length: MathUtils.toFixedFloat(length, PRECISION),
      _length: MathUtils.toFixedFloat(convertedLength, PRECISION),
      _unit: displayUnit,
    });
  }

  buildLineMetricDisplays(element, layer, vertexOne, vertexTwo, displayUnit) {
    const metrics = getWallEdgeMetrics(element, layer, { vertex0: vertexOne, vertex1: vertexTwo });
    if (!metrics) {
      return {
        innerLength: this.buildLengthMeasure(0, displayUnit),
        outerLength: this.buildLengthMeasure(0, displayUnit),
      };
    }

    return {
      innerLength: this.buildLengthMeasure(metrics.outerEdge.length, displayUnit),
      outerLength: this.buildLengthMeasure(metrics.innerEdge.length, displayUnit),
    };
  }

  buildLineLengthMeasure(length, displayUnit) {
    const safeLength = Math.max(0, Number(length) || 0);
    return new Map({
      length: MathUtils.toFixedFloat(safeLength, PRECISION),
      _length: MathUtils.toFixedFloat(convert(safeLength).from(this.context.catalog.unit).to(displayUnit), PRECISION),
      _unit: displayUnit,
    });
  }

  updateLineAttributesWithLength(attributesFormData, value) {
    let v_0 = attributesFormData.get('vertexOne');
    let v_1 = attributesFormData.get('vertexTwo');
    const nextUnit = value.get('_unit') || attributesFormData.getIn(['lineLength', '_unit']) || this.context.catalog.unit;
    const requestedLength = Math.max(0, Number(value.get('length')) || 0);

    let [v_a, v_b] = GeometryUtils.orderVertices([v_0, v_1]);
    let v_b_new = GeometryUtils.extendLine(v_a.x, v_a.y, v_b.x, v_b.y, requestedLength, GEOMETRY_PRECISION);

    return attributesFormData.withMutations(attr => {
      const nextVertexOne = attr.get('vertexOne');
      const nextVertexTwo = attr.get('vertexTwo');
      const updatedVertexOne = v_0 === v_a ? nextVertexOne : nextVertexOne.merge(v_b_new);
      const updatedVertexTwo = v_0 === v_a ? nextVertexTwo.merge(v_b_new) : nextVertexTwo;
      const nextLineLengthValue = GeometryUtils.verticesDistance(updatedVertexOne, updatedVertexTwo);
      const nextMetrics = this.buildLineMetricDisplays(
        this.props.element,
        this.props.layer,
        updatedVertexOne,
        updatedVertexTwo,
        nextUnit
      );

      attr.set(v_0 === v_a ? 'vertexTwo' : 'vertexOne', v_b.merge(v_b_new));
      attr.set('lineLength', this.buildLineLengthMeasure(nextLineLengthValue, nextUnit));
      attr.set('innerLength', nextMetrics.innerLength);
      attr.set('outerLength', nextMetrics.outerLength);
    });
  }

  initAttrData(element, layer, state) {

    element = typeof element.misc === 'object' ? element.set('misc', new Map(element.misc)) : element;

    switch (element.prototype) {
      case 'items': {
        return new Map(element);
      }
      case 'lines': {
        let v_a = layer.vertices.get(element.vertices.get(0));
        let v_b = layer.vertices.get(element.vertices.get(1));

        let distance = GeometryUtils.pointsDistance(v_a.x, v_a.y, v_b.x, v_b.y);
        let _unit = element.misc.get('_unitLength') || this.context.catalog.unit;
        let _length = convert(distance).from(this.context.catalog.unit).to(_unit);
        const lineMetricDisplays = this.buildLineMetricDisplays(element, layer, v_a, v_b, _unit);

        return new Map({
          vertexOne: v_a,
          vertexTwo: v_b,
          lineLength: new Map({length: distance, _length, _unit}),
          innerLength: lineMetricDisplays.innerLength,
          outerLength: lineMetricDisplays.outerLength,
        });
      }
      case 'holes': {
        let line = layer.lines.get(element.line);
        
        // Safeguard: check if line and its vertices exist
        if (!line || !line.vertices || line.vertices.size < 2) {
          console.warn('Hole element has invalid line reference:', element.line, 'element:', element.toJS ? element.toJS() : element);
          // Return null to hide the attribute editor for invalid holes
          return null;
        }
        
        let vertex0 = layer.vertices.get(line.vertices.get(0));
        let vertex1 = layer.vertices.get(line.vertices.get(1));
        
        // Safeguard: check if vertices exist
        if (!vertex0 || !vertex1) {
          console.warn('Hole line has invalid vertices');
          return new Map({
            offset: element.offset || 0,
            offsetA: new Map({
              length: 0,
              _length: 0,
              _unit: this.context.catalog.unit
            }),
            offsetB: new Map({
              length: 0,
              _length: 0,
              _unit: this.context.catalog.unit
            })
          });
        }
        
        let {x: x0, y: y0} = vertex0;
        let {x: x1, y: y1} = vertex1;
        let lineLength = GeometryUtils.pointsDistance(x0, y0, x1, y1);
        let startAt = lineLength * element.offset - element.properties.get('width').get('length') / 2;

        let _unitA = element.misc.get('_unitA') || this.context.catalog.unit;
        let _lengthA = convert(startAt).from(this.context.catalog.unit).to(_unitA);

        let endAt = lineLength - lineLength * element.offset - element.properties.get('width').get('length') / 2;
        let _unitB = element.misc.get('_unitB') || this.context.catalog.unit;
        let _lengthB = convert(endAt).from(this.context.catalog.unit).to(_unitB);

        return new Map({
          offset: element.offset,
          offsetA: new Map({
            length: MathUtils.toFixedFloat(startAt, PRECISION),
            _length: MathUtils.toFixedFloat(_lengthA, PRECISION),
            _unit: _unitA
          }),
          offsetB: new Map({
            length: MathUtils.toFixedFloat(endAt, PRECISION),
            _length: MathUtils.toFixedFloat(_lengthB, PRECISION),
            _unit: _unitB
          })
        });
      }
      case 'areas': {
        return new Map({});
      }
      default:
        return null;
    }


  }

  initPropData(element, layer, state) {
    let {catalog} = this.context;
    
    // Safeguard: check if element has a valid type
    if (!element.type) {
      console.warn('Element has no type, cannot initialize properties:', element);
      return new Map({});
    }
    
    let catalogElement = catalog.getElement(element.type);

    let mapped = {};
    for (let name in catalogElement.properties) {
      mapped[name] = new Map({
        currentValue: element.properties.has(name) ? element.properties.get(name) : fromJS(catalogElement.properties[name].defaultValue),
        configs: catalogElement.properties[name]
      });
    }

    // For areas: compute the inset floor area and inject it as the read-only
    // areaSize property value so the properties panel shows an up-to-date figure.
    if (element.prototype === 'areas' && mapped['areaSize']) {
      try {
        const verts = [];
        element.vertices.forEach(vertID => {
          const v = layer.vertices.get(vertID);
          if (v) verts.push({ x: v.x, y: v.y, id: v.id });
        });
        if (verts.length >= 3) {
          const insetVerts = computeInsetPolygon(verts, layer);
          let areaCm2 = polygonAreaShoelace(insetVerts);
          // Subtract interior holes
          element.holes && element.holes.forEach(holeID => {
            const hole = layer.areas && layer.areas.get(holeID);
            if (hole && hole.vertices) {
              const hv = [];
              hole.vertices.forEach(vid => {
                const v = layer.vertices.get(vid);
                if (v) hv.push({ x: v.x, y: v.y, id: v.id });
              });
              if (hv.length >= 3) areaCm2 -= polygonAreaShoelace(hv);
            }
          });
          mapped['areaSize'] = mapped['areaSize'].set('currentValue', formatAreaM2(Math.max(0, areaCm2)));
        }
      } catch (e) {
        console.warn('[ElementEditor] area size computation failed:', e);
      }
    }

    return new Map(mapped);
  }

  updateAttribute(attributeName, value) {

    let {attributesFormData} = this.state;

    switch (this.props.element.prototype) {
      case 'items': {
        attributesFormData = attributesFormData.set(attributeName, value);
        break;
      }
      case 'lines': {
        switch(attributeName)
        {
          case 'lineLength':
          {
            attributesFormData = this.updateLineAttributesWithLength(attributesFormData, value);
            break;
          }
          case 'innerLength':
          case 'outerLength':
          {
            const desiredEdgeLength = Number(value.get('length'));
            const edgeUnit = value.get('_unit') || attributesFormData.getIn([attributeName, '_unit']) || this.context.catalog.unit;
            const vertexOne = attributesFormData.get('vertexOne');
            const vertexTwo = attributesFormData.get('vertexTwo');
            const metrics = getWallEdgeMetrics(this.props.element, this.props.layer, {
              vertex0: vertexOne,
              vertex1: vertexTwo,
            });

            if (!metrics || !Number.isFinite(desiredEdgeLength)) {
              break;
            }

            const selectedEdge = attributeName === 'innerLength' ? metrics.innerEdge : metrics.outerEdge;
            const edgeOffset = selectedEdge.length - metrics.length;
            const nextLength = Math.max(0, desiredEdgeLength - edgeOffset);
            const nextLineLength = this.buildLineLengthMeasure(nextLength, edgeUnit);

            attributesFormData = this.updateLineAttributesWithLength(attributesFormData, nextLineLength);
            break;
          }
          case 'vertexOne':
          case 'vertexTwo':
          {
            attributesFormData = attributesFormData.withMutations(attr => {
              attr.set(attributeName, attr.get(attributeName).merge(value));

              let newDistance = GeometryUtils.verticesDistance(attr.get('vertexOne'), attr.get('vertexTwo'));
              const nextUnit = attr.get('lineLength').get('_unit');
              const nextMetrics = this.buildLineMetricDisplays(
                this.props.element,
                this.props.layer,
                attr.get('vertexOne'),
                attr.get('vertexTwo'),
                nextUnit
              );

              attr.mergeIn(['lineLength'], attr.get('lineLength').merge({
                'length': newDistance,
                '_length': convert(newDistance).from(this.context.catalog.unit).to(attr.get('lineLength').get('_unit'))
              }));
              attr.set('innerLength', nextMetrics.innerLength);
              attr.set('outerLength', nextMetrics.outerLength);
            });
            break;
          }
          default:
          {
            attributesFormData = attributesFormData.set(attributeName, value);
            break;
          }
        }
        break;
      }
      case 'holes': {
        switch( attributeName )
        {
          case 'offsetA':
          {
            let line = this.props.layer.lines.get(this.props.element.line);

            let orderedVertices = GeometryUtils.orderVertices([
              this.props.layer.vertices.get(line.vertices.get(0)),
              this.props.layer.vertices.get(line.vertices.get(1))
            ]);

            let [ {x: x0, y: y0}, {x: x1, y: y1} ] = orderedVertices;

            let alpha = GeometryUtils.angleBetweenTwoPoints(x0, y0, x1, y1);
            let lineLength = GeometryUtils.pointsDistance(x0, y0, x1, y1);
            let widthLength = this.props.element.properties.get('width').get('length');
            let halfWidthLength = widthLength / 2;

            let lengthValue = value.get('length');
            lengthValue = Math.max(lengthValue, 0);
            lengthValue = Math.min(lengthValue, lineLength - widthLength);

            let xp = (lengthValue + halfWidthLength) * Math.cos(alpha) + x0;
            let yp = (lengthValue + halfWidthLength) * Math.sin(alpha) + y0;

            let offset = GeometryUtils.pointPositionOnLineSegment(x0, y0, x1, y1, xp, yp);

            let endAt = MathUtils.toFixedFloat(lineLength - (lineLength * offset) - halfWidthLength, PRECISION);
            let offsetUnit = attributesFormData.getIn(['offsetB', '_unit']);

            let offsetB = new Map({
              length: endAt,
              _length: convert(endAt).from(this.context.catalog.unit).to(offsetUnit),
              _unit: offsetUnit
            });

            attributesFormData = attributesFormData.set('offsetB', offsetB).set('offset', offset);

            let offsetAttribute = new Map({
              length: MathUtils.toFixedFloat(lengthValue, PRECISION),
              _unit: value.get('_unit'),
              _length: MathUtils.toFixedFloat(convert(lengthValue).from(this.context.catalog.unit).to(value.get('_unit')), PRECISION)
            });

            attributesFormData = attributesFormData.set(attributeName, offsetAttribute);

            break;
          }
          case 'offsetB':
          {
            let line = this.props.layer.lines.get(this.props.element.line);

            let orderedVertices = GeometryUtils.orderVertices([
              this.props.layer.vertices.get(line.vertices.get(0)),
              this.props.layer.vertices.get(line.vertices.get(1))
            ]);

            let [ {x: x0, y: y0}, {x: x1, y: y1} ] = orderedVertices;

            let alpha = GeometryUtils.angleBetweenTwoPoints(x0, y0, x1, y1);
            let lineLength = GeometryUtils.pointsDistance(x0, y0, x1, y1);
            let widthLength = this.props.element.properties.get('width').get('length');
            let halfWidthLength = widthLength / 2;

            let lengthValue = value.get('length');
            lengthValue = Math.max(lengthValue, 0);
            lengthValue = Math.min(lengthValue, lineLength - widthLength);

            let xp = x1 - (lengthValue + halfWidthLength) * Math.cos(alpha);
            let yp = y1 - (lengthValue + halfWidthLength) * Math.sin(alpha);

            let offset = GeometryUtils.pointPositionOnLineSegment(x0, y0, x1, y1, xp, yp);

            let startAt = MathUtils.toFixedFloat((lineLength * offset) - halfWidthLength, PRECISION);
            let offsetUnit = attributesFormData.getIn(['offsetA', '_unit']);

            let offsetA = new Map({
              length: startAt,
              _length: convert(startAt).from(this.context.catalog.unit).to(offsetUnit),
              _unit: offsetUnit
            });

            attributesFormData = attributesFormData.set('offsetA', offsetA).set('offset', offset);

            let offsetAttribute = new Map({
              length: MathUtils.toFixedFloat(lengthValue, PRECISION),
              _unit: value.get('_unit'),
              _length: MathUtils.toFixedFloat(convert(lengthValue).from(this.context.catalog.unit).to(value.get('_unit')), PRECISION)
            });

            attributesFormData = attributesFormData.set(attributeName, offsetAttribute);

            break;
          }
          default:
          {
            attributesFormData = attributesFormData.set(attributeName, value);
            break;
          }
        };
        break;
      }
      default:
        break;
    }

    this.setState({attributesFormData});
    this.save({attributesFormData});
  }

  updateProperty(propertyName, value) {
    let {state: {propertiesFormData}} = this;
    propertiesFormData = propertiesFormData.setIn([propertyName, 'currentValue'], value);
    this.setState({propertiesFormData});
    this.save({propertiesFormData});
  }

  reset() {
    this.setState({propertiesFormData: this.initPropData(this.props.element, this.props.layer, this.props.state)});
  }

  save({propertiesFormData, attributesFormData}) {

    if( propertiesFormData ) {
      let properties = propertiesFormData.map(data => {
        return data.get('currentValue');
      });

      this.context.projectActions.setProperties(properties);
    }

    if( attributesFormData ) {
      switch (this.props.element.prototype) {
        case 'items': {
          this.context.projectActions.setItemsAttributes(attributesFormData);
          break;
        }
        case 'lines': {
          this.context.projectActions.setLinesAttributes(attributesFormData);
          break;
        }
        case 'holes': {
          this.context.projectActions.setHolesAttributes(attributesFormData);
          break;
        }
      }
    }
  }

  render() {
    let {
      state: {propertiesFormData, attributesFormData},
      context: {catalog},
      props: {state: appState, element}
    } = this;

    return (
      <div>

        {attributesFormData && (
          <AttributesEditor
            element={element}
            onUpdate={this.updateAttribute}
            attributeFormData={attributesFormData}
            state={appState}
          />
        )}

        {propertiesFormData.entrySeq()
          .map(([propertyName, data]) => {

            let currentValue = data.get('currentValue'), configs = data.get('configs');

            let {Editor} = catalog.getPropertyType(configs.type);

            return <Editor
              key={propertyName}
              propertyName={propertyName}
              value={currentValue}
              configs={configs}
              onUpdate={value => this.updateProperty(propertyName, value)}
              state={appState}
              sourceElement={element}
              internalState={this.state}
            />
          })
        }

      </div>
    )
  }
}

ElementEditor.propTypes = {
  state: PropTypes.object.isRequired,
  element: PropTypes.object.isRequired,
  layer: PropTypes.object.isRequired
};

ElementEditor.contextType = PlannerContext;
