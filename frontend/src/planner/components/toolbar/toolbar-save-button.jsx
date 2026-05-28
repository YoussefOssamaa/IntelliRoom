import React from 'react';
import PropTypes from 'prop-types';
import { usePlanner } from '../../context/PlannerContext';
import {FaSave as IconSave} from 'react-icons/fa';
import ToolbarButton from './toolbar-button';

export default function ToolbarSaveButton({state}) {
  const { translator, projectActions } = usePlanner();

  let saveProjectToFile = e => {
    e.preventDefault();
    projectActions?.saveProject?.();
  };

  return (
    <ToolbarButton active={false} tooltip={translator.t('Save project')} onClick={saveProjectToFile}>
      <IconSave />
    </ToolbarButton>
  );
}

ToolbarSaveButton.propTypes = {
  state: PropTypes.object.isRequired,
};

