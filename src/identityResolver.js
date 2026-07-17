function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export async function resolveIdentity(client, userEmail) {
  if (!userEmail) {
    throw new Error('AZURE_DEVOPS_USER_EMAIL não foi configurado.');
  }

  const users = await client.findUsersByEmail(userEmail);
  const user = users.find((candidate) => {
    return normalize(candidate.mailAddress) === normalize(userEmail)
      || normalize(candidate.principalName) === normalize(userEmail);
  }) || users[0];

  if (!user) {
    throw new Error(`Usuário não encontrado no Azure DevOps para o e-mail ${userEmail}.`);
  }

  const memberships = await client.getMemberships(user.descriptor);
  const groups = await Promise.all(
    memberships.map(async (membership) => {
      const descriptor = membership.containerDescriptor;
      try {
        const [subject, storageKey] = await Promise.all([
          client.getGraphGroup(descriptor),
          client.getStorageKey(descriptor).catch(() => null)
        ]);

        return {
          descriptor,
          id: storageKey?.value || storageKey?.id || null,
          displayName: subject.displayName || subject.principalName || descriptor,
          principalName: subject.principalName || null
        };
      } catch {
        return {
          descriptor,
          id: null,
          displayName: descriptor,
          principalName: null
        };
      }
    })
  );

  return {
    user: {
      id: user.originId || user.id || null,
      descriptor: user.descriptor,
      displayName: user.displayName,
      uniqueName: user.mailAddress || user.principalName || userEmail,
      principalName: user.principalName || null
    },
    groups
  };
}
