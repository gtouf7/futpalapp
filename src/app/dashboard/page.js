
'use client';
import { useRouter } from "next/navigation";
import { useState, useEffect, useContext } from "react";
import styles from './dashboard.module.css';
import Header from '../components/Header';
import { UserContext } from "../context/userContext";

export default function Dashboard() {
    const router = useRouter();
    const { user, loading, refresh, setUser } = useContext(UserContext);
    const [token, setToken] = useState(null);
    const [currentFixture, setCurrentFixture] = useState(null);
    const [gamePlayed, setGamePlayed] = useState(false);
    const [ownTeamMatch, setOwnTeamMatch] = useState(false);

    
    
    // Check if user is logged in and redirect if not
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
        if (typeof window !== "undefined" && !token) {
            setToken(localStorage.getItem('token'));
        }
    }, [loading, user, router, token]);

    // Determine the next fixture and match status
    useEffect(() => {
        if (user) {
            const nextFixture = user.league.fixtures.find(fixture =>
                fixture.matches.some(match => match.result.home === null && match.result.away === null)
            );

            setCurrentFixture(nextFixture);

            if (nextFixture) {
                const userMatch = nextFixture.matches.find(match =>
                    match.homeTeam._id === user.team._id || match.awayTeam._id === user.team._id
                );

                setGamePlayed(true);
            }
        }
    }, [user]);

    const handlePlayGame = async () => {
        if (!currentFixture || !token) return;

        const currentMatch = currentFixture.matches.find(match =>
            match.homeTeam._id === user.team._id || match.awayTeam._id === user.team._id
        );

        if (currentMatch && !gamePlayed) {
            const response = await fetch('/api/matchSimulator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ fixtureId: currentFixture._id, matchId: currentMatch._id, token })
            });

            const resultData = await response.json();
            const updatedFixture = resultData.fixture;

            if (updatedFixture && updatedFixture._id) {
                const updatedFixtures = user.league.fixtures.map(fixture =>
                    fixture._id === updatedFixture._id ? updatedFixture : fixture
                );

                setUser(prev => ({
                    ...prev,
                    league: {
                        ...prev.league,
                        fixtures: updatedFixtures,
                    },
                }));

                setGamePlayed(true);
                await refresh();
            }
        } else if (gamePlayed) {
            await simulateRemainingGames(currentFixture);
        }
    };
    
    const simulateRemainingGames = async (fixture) => {
        for (const match of fixture.matches) {
            if (match.result.home === null && match.result.away === null) {
                await fetch('/api/matchSimulator', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ fixtureId: fixture._id, matchId: match._id, token })
                });
                await refresh();
                break;
            }
        }
    };
    
    const [upcomingMatch, setUpcomingMatch] = useState(null);

    useEffect(() => {
        if(currentFixture && user) {
        const nextGame = currentFixture.matches.find(
            match => match.result.home === null
        );
        setUpcomingMatch(nextGame);

        if (nextGame && (nextGame.homeTeam.name === user.team.name || nextGame.awayTeam.name === user.team.name)) {
            setOwnTeamMatch(true);
        } else {
            setOwnTeamMatch(false);
        }
    }
    }, [currentFixture, user]);
console.log(upcomingMatch)
    return user ? (
        <div className={styles.main}>
            <Header />
            <h2>Welcome, {user && user.username}!</h2>
            <div className={styles.container}>
            {upcomingMatch ? (
                <div className={styles.wrapper}>
                    <h3>Next game</h3>
                    <div className={styles.nextFixture}>
                        <img src={upcomingMatch.homeTeam.logo.img} alt={upcomingMatch.homeTeam.logo.alt}></img>
                        <span>VS</span>
                        <img src={upcomingMatch.awayTeam.logo.img} alt={upcomingMatch.awayTeam.logo.alt}></img>
                    </div>
                    <button className={styles.btn} onClick={handlePlayGame}>{ownTeamMatch ? 'Play Game' : 'Continue'}</button>
                </div>
            ) : ( <p> Loading match...</p>)}
            {upcomingMatch ? (
                <div className={styles.infoWrapper}>
                    <h3>Match Details</h3>
                    <p><span>Stadium:</span> {upcomingMatch.homeTeam.stadium}</p>
                    <p><span>City:</span> {upcomingMatch.homeTeam.city},{upcomingMatch.homeTeam.country}</p>
                </div>
            ) : ( <p> Loading data...</p>)}
            </div>
        </div>
    ) : (
        <p>Loading your data...</p>
    );
}
