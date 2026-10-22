import type { Challenge, Team, User } from "./types";

type ScoringChallenge = Pick<Challenge, "id" | "points" | "patternPoints" | "codePoints" | "number">;

export function scoreProgress(
  solvedIds: readonly string[],
  patternIds: readonly string[],
  challenges: readonly ScoringChallenge[]
): number {
  const solved = new Set(solvedIds);
  const patterns = new Set(patternIds);

  return challenges.reduce((score, challenge) => {
    const patternScore = patterns.has(challenge.id) ? (challenge.patternPoints ?? 0) : 0;
    const codeScore = solved.has(challenge.id) ? (challenge.codePoints ?? challenge.points) : 0;
    return score + patternScore + codeScore;
  }, 0);
}

export function scoreTeam(team: Team, members: readonly Pick<User, "solved" | "patterns">[], challenges: readonly ScoringChallenge[]): number {
  const optionalChallenges = challenges.filter((challenge) => challenge.number === 3 || challenge.number === 4);
  const sharedChallenges = challenges.filter((challenge) => challenge.number !== 3 && challenge.number !== 4);
  const optionalIds = new Set(optionalChallenges.map((challenge) => challenge.id));

  const sharedScore = scoreProgress(
    team.solved.filter((id) => !optionalIds.has(id)),
    (team.patterns ?? []).filter((id) => !optionalIds.has(id)),
    sharedChallenges
  );
  const personalOptionalScore = members.reduce(
    (total, member) =>
      total +
      scoreProgress(
        member.solved.filter((id) => optionalIds.has(id)),
        (member.patterns ?? []).filter((id) => optionalIds.has(id)),
        optionalChallenges
      ),
    0
  );

  return sharedScore + personalOptionalScore;
}
