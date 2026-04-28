import React from 'react';
import PropTypes from 'prop-types';
import { Map } from 'immutable';
import { usePlanner } from '../../../../context/PlannerContext';
import { FormTextInput } from '../../../style/export';
import { PropertyLengthMeasure } from '../../../../catalog/properties/export';

const tableStyle = { width: '100%' };
const firstTdStyle = { width: '6em' };
const inputStyle = { textAlign: 'left' };

export default function LineAttributesEditor({element, onUpdate, attributeFormData, state, ...rest}) {
  const { translator } = usePlanner();
  const defaultUnit = state.getIn(['scene', 'unit']);

  let name = attributeFormData.has('name') ? attributeFormData.get('name') : element.name;
  let innerLength = attributeFormData.has('innerLength') ? attributeFormData.get('innerLength') : new Map({ length: 0, _length: 0, _unit: defaultUnit });
  let outerLength = attributeFormData.has('outerLength') ? attributeFormData.get('outerLength') : new Map({ length: 0, _length: 0, _unit: defaultUnit });

  return (
    <div>
      <table style={tableStyle}>
        <tbody>
          <tr>
            <td style={firstTdStyle}>{translator.t('Name')}</td>
            <td>
              <FormTextInput
                value={name}
                onChange={event => onUpdate('name', event.target.value)}
                style={inputStyle}
              />
            </td>
          </tr>
        </tbody>
      </table>
        <PropertyLengthMeasure
          value={innerLength}
          onUpdate={mapped => onUpdate('innerLength', mapped)}
          configs={{label: translator.t('Inner Length'), min: 0, max: Infinity, precision: 2}}
          state={state}
        />
        <PropertyLengthMeasure
          value={outerLength}
          onUpdate={mapped => onUpdate('outerLength', mapped)}
          configs={{label: translator.t('Outer Length'), min: 0, max: Infinity, precision: 2}}
          state={state}
        />
    </div>
  );
}

LineAttributesEditor.propTypes = {
  element: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onValid: PropTypes.func,
  attributeFormData: PropTypes.object.isRequired,
  state: PropTypes.object.isRequired
};


