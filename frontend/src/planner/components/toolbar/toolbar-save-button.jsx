import React from 'react';
import PropTypes from 'prop-types';
import { usePlanner } from '../../context/PlannerContext';
import {FaSave as IconSave} from 'react-icons/fa';
import ToolbarButton from './toolbar-button';
import {browserDownload}  from '../../utils/browser';
import { Project } from '../../class/export';

export default function ToolbarSaveButton({state}) {
  const { translator } = usePlanner();

  let saveProjectToFile = e => {
    e.preventDefault();
    state = Project.unselectAll( state ).updatedState;
    browserDownload(state.get('scene').toJS());
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

