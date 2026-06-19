import teamMembers from '../../data/teamMembers.js';

export const getTeamMembers = (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const members = teamMembers.map((member) => ({
    ...member,
    photoUrl: `${baseUrl}/api/team/photos/${member.photo}`,
  }));

  res.status(200).json({
    success: true,
    count: members.length,
    data: members,
  });
};
