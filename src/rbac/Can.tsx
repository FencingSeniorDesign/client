import React from 'react';
import { createContextualCan } from '@casl/react';
import { AbilityContext, useAbility } from './AbilityContext';

// Create the Can component using CASL's createContextualCan
// We need to adapt it to extract the ability from our updated context
const CanAdapter = (props: any) => {
    const { ability } = useAbility();
    return props.children(ability);
};

export const Can = createContextualCan(CanAdapter);
